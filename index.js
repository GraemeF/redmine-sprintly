var config = require('./config');
var Step = require('step');
var Redminer = require('redminer');
var Sprintly = require("sprintly");
require('sugar');

var sprintly = new Sprintly(config.sprintly.people.other.email, config.sprintly.people.other.apiKey);
var redminer = new Redminer(process.env.REDMINE_URL, process.env.REDMINE_APIKEY);

var escape = function(text) {
    return text.replace('#', '\\#');
  };

var getCredentials = function(name) {
    if (config.sprintly.people.hasOwnProperty(name)) {
      return config.sprintly.people[name];
    } else {
      return null;
    }
  };

var convertJournalToComment = function(journal) {
    if (!journal.notes) return null;
    var auth = getCredentials(journal.user.name);

    return {
      auth: auth,
      body: '*' + (auth ? '' : journal.user.name + ' - ') + journal.created_on + '*\n\n' + journal.notes
    };
  };

var getDescription = function(issue) {
    return '[Redmine \\#' + issue.id + '](' + redminer.getIssueUri(issue.id) + ' "See this issue on Redmine")' + ' - ' + issue.author.name + ' - ' + issue.created_on + '\n\n' + escape(issue.description);
  };

var convertIssueToItem = function(issue, members, callback) {
    console.log("Getting issue detail:", issue.subject);
    redminer.getIssue(issue.id, function(error, detail) {

      var assignee = members.find(function(x) {
        return issue.assigned_to && (x.first_name + ' ' + x.last_name) == issue.assigned_to.name;
      });

      callback(null, {
        type: config.mapping.tracker[issue.tracker.name],
        title: issue.subject,
        description: getDescription(issue),
        status: config.mapping.status[issue.status.name],
        comments: detail.journals.map(convertJournalToComment).filter(function(x) {
          return x !== null;
        }),
        assigned_to: assignee ? assignee.id : 0
      });
    });
  };

var addItemForIssue = function(productId, issue, members, callback) {
    Step(function() {
      convertIssueToItem(issue, members, this);
    }, function(error, card) {
      if (error) {
        console.log("Could not convert issue to card:", error);
        throw error
      }

      var self = this;
      sprintly.addItem(getCredentials(issue.author.name), productId, card, function(error, sprintlyCard) {
        if (error) {
          console.log('Could not add card:', error);
          throw error;
        }
        self(null, {
          card: card,
          cardId: sprintlyCard.number
        });
      });
    }, function(error, stuff) {
      if (error) {
        console.log('Could not create stuff after adding card:', error);
        throw error;
      }
      var group = this.group();

      var commentCount = stuff.card.comments.length;
      if (commentCount > 0) console.log("Adding " + commentCount + ' comments.');

      stuff.card.comments.each(function(comment) {
        sprintly.addCommentToItem(comment.auth, config.sprintly.productId, stuff.cardId, comment.body, group());
      });
    }, callback);
  };

Step(function() {
  console.log("Getting issues.");
  redminer.getAllIssues(config.redmine.query, this.parallel());
  console.log("Getting people.");
  sprintly.getPeople(config.sprintly.productId, this.parallel());
}, function(error, issues, members) {
  if (error) {
    console.log('Something went wrong during startup:', error);
    throw error;
  }

  var uniqueIssues = issues.unique('id');
  var statuses = uniqueIssues.map(function(x) {
    return x.status;
  }).unique();

  var self = this;
  var group = this.group();

  uniqueIssues.each(function(issue) {
    console.log("Adding card:", issue.subject);
    addItemForIssue(config.sprintly.productId, issue, members, group());
  });
}, function(error, createdCards) {
  if (error) {
    console.log(error);
    throw error;
  }
  console.log('Added ' + createdCards.length + ' cards.');
});
