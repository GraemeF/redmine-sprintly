redmine-sprintly
================

This is a utility to copy stuff from Redmine to Sprint.ly.

Usage
-----

A fair bit of configuration is required to get this to work, so edit `config.json`
and enter your API keys and such as indicated. The following settings warrant some additional notes:

* `redmine.query` is the id of a query saved in Redmine - only the issues listed by this query are copied.
* `sprintly.people` lists the people you have already added to your Sprint.ly product. If you supply email and API key for a person then any issues created by them in Redmine will also be created by them in Sprint.ly (matched by name).
* `sprintly.people.other` is the person in Sprint.ly that will create everything not matched by another.
* `mapping.tracker` describes how your trackers in Redmine are mapped to item types in Sprint.ly.
* `mapping.status` says which statuses in Redmine should be put in which list in Sprint.ly.

Please feel free to fork and improve this - pull requests welcome!
