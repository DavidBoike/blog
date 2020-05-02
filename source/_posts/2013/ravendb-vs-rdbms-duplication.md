---
layout: post
date: 2013-01-23
title: 'RavenDB vs RDBMS: Duplication'
permalink: ravendb-vs-rdbms-duplication
categories:
- Development
tags:
- RavenDB
- SQL Server
- RDBMS
comments: true
---
*Recently [Charlie Barker](http://www.dualbotic.com/DB/blog/) ([@Porkstone](https://twitter.com/porkstone) on Twitter) asked me what I felt were pros and cons of using RavenDB over a standard relational database. In this series of posts I highlight the differences between RavenDB and a RDBMS that I have experienced after completing three projects that incorporate Raven in some capacity.*

 Once I was asked how difficult it would be to duplicate a nontrivial data structure that was stored in SQL Server. I shuddered, knowing that this particular data structure included hierarchical data represented as rows where children pointed to the ID of their parent, and all those parent-child relationships in the duplicated data would need to be preserved.

Luckily in that case, some careful application of the [5 Whys](http://en.wikipedia.org/wiki/5_Whys) technique made actual duplication unnecessary, and that's a good thing, because it would have proven to be nearly impossible.

<!-- more -->

With RavenDB, however, it's trivial to take a document and save its contents with a different ID, or to take a chunk of one document and include it within another. The hierarchical data would, for instance, be stored in Raven as nested lists, or in other words exactly how you'd represent it in code. In Raven it just works, and there are no ParentIds to maintain, so you can easily duplicate the entire structure. This opens up an interesting possibility for editing with the ability to publish or cancel.

-   Create a Widget as "widgets/1234"
-   My user "users/david" wants to edit the Widget, so duplicate it and save it as "widgets/1234/editing/users/david". Then all my edits go to this temporary document.
-   If I want to publish the Widget, copy the content of "widgets/1234/editing/users/david" back to "widgets/1234".
-   Or, if I want to discard my changes, just delete "widgets/1234/editing/users/david".

 Duplicates don't even have to be stored exactly as duplicates. The "editing" document can be another type containing metadata and the content Widget as a property.

You could also contain a complete history of a Widget by having the documents "widgets/1234" and another document named "widgets/1234/history" containing a list of the prior iterations of the widget. I would not contain all the history in the primary Widget document, however, because you generally will not want to load all the historical iterations of the Widget just to show the most recent details on screen.

In the next post I'll explore polymorphism in an RDBMS and how Raven makes life so much simpler.
