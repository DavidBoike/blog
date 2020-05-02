---
layout: post
date: 2013-01-24
title: 'RavenDB vs RDBMS: Polymorphism'
permalink: ravendb-vs-rdbms-polymorphism
categories:
- Development
tags:
- RavenDB
- SQL Server
- polymorphism
- RDBMS
comments: true
---
*Recently [Charlie Barker](http://www.dualbotic.com/DB/blog/) ([@Porkstone](https://twitter.com/porkstone) on Twitter) asked me what I felt were pros and cons of using RavenDB over a standard relational database. In this series of posts I highlight the differences between RavenDB and a RDBMS that I have experienced after completing three projects that incorporate Raven in some capacity.*

SQL Server is generally poor at doing any sort of polymorphism because normalized rows and columns are just not really good at representing that.

<!-- more -->

Here's just a small sampling of (all bad, in my opinion) ways I can think of to handle polymorphism in SQL Server:

1.  One table that contains a column for every single property that could possibly be used by every single inherited type. All of these columns naturally must be nullable, even though null may not be valid for certain inherited classes. Yuck.
2.  One table for the base class containing the properties of the base class. Another table for each inherited class, related to the base class by primary key, containing only the properties that are local to that class. This is a better structure overall, but it makes it ridiculously difficult to refactor. Additionally every layer of inheritance requires yet another table, which can quickly create a requirement to read many tables just to fetch one object instance. You could also have problems with deadlocks with many different tables needing to be locked in order to update an instance.
3.  One table for every top-level usable class. It can get really difficult to maintain a common ID concept in this case, and it makes a "load by ID" operation without knowing the type impossible, since you'd have no idea which table to load from. Also if you need to add something to a base class, you now have multiple tables that must be updated.
4.  Put the important, queryable, base-class properties into columns, and then form a sort of flat storage mechanism for the extended attributes, which you then cram into SQL Server however you can get them to fit. Most of the time the extended attributes are presented in code as a dictionary which properties on the inherited classes can read/write from. This dictionary then gets encoded either into a separate Key/Value table, or perhaps formatted to fit into one or two nvarchar(max) columns. I've seen a scheme to do this where the keys are encoded like "Key1:0:5:Key2:5:7:" meaning "Key1 starts at character 0 and is 5 characters long, then Key2 starts at character 5 and is 7 characters long." Then the values are appended to each other so that the keys can be used to perform a Substring on the values. If this looks messy and nasty, it's because it is, and forget trying to query into any of that data - it becomes only accessible from code.
5.  Put the important, queryable, base-class properties into columns, and then include an xml column to store everything else as a serialized object. This is a LOT better than the extended attribute case because it is actually possible to put an index on that XML data and do some limited querying against it. However at this point you have to pause and realize that you're using SQL Server as a document database anyway, without any of the benefits that a *real* document database has to offer! So why not just make the leap?

 Relational databases were conceived at a time when most computer activity occurred on green screens and it was all values that fit in rows and columns. We have just forced it to store all of our ever-more-complex data structures that we have built over the years.

So how does Raven handle inheritance? It just does, with zero effort.

Under the covers, when you save an object graph where an object instance is not the exact same type as the property type, Raven's JSON serializer adds a property called \$type\$ that contains the name of the type that should be instantiated on deserialization. That's it. It just works.

You can still include data from sub- or super-classes in indexes and query for it. It's just easy. Actually it's a lot more difficult to build a [polymorphic model binder for MVC](http://stackoverflow.com/questions/7222533/polymorphic-model-binding) than it is to store that model data in Raven.

This is a MAJOR win for RavenDB in my book.
