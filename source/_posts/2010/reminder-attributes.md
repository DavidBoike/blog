---
layout: post
date: 2010-03-03
title: Reminder Attributes
permalink: reminder-attributes
categories:
- Development
tags:
- attributes
comments: true
---
I strongly believe that code isn't perfect.  Ever.  There's always some improvement that can be made, but frequently I don't have time to do it, or for whatever reason I can't do it.  I want to be able to remember where these things are, so that someday when I have free time (insert laugh here) I can go back and do something about it.

A bug tracking system is good, but if it's something that exists in multiple locations it can be hard to document where all those points are in a defect report.  Even thorough documentation can be hard to track down later if refactoring or re-engineering moves code around.

Since the first version of Visual Studio, there were [TODO Comments](http://dotnetperls.com/todo-comments-visual-studio), but these are of limited usefulness.  They show up in Visual Studio's Task List toolbar (select Task List from the View menu, then select Comments from the dropdown in the toolbar) but only if the file containing the comments is open.  What if I'm trying to do something across multiple classes and methods?

Prime example: we still have SQL Server 2000 databases.  We have a new SQL Server 2008 to migrate to, but with an ample amount of legacy code, the migration is anything but simple, and there are always more important projects with revenue attached.

In the meantime, we have features that would benefit from [Common Table Expressions](http://msdn.microsoft.com/en-us/library/ms190766.aspx) or [Table Valued Parameters](http://msdn.microsoft.com/en-us/library/bb510489.aspx), but we can't use them because we're still stuck on SQL 2000 for the time being.  I need to be able to mark those chunks of code so I can find them all back someday when the database migration is complete.

Enter reminder attributes.

<!-- more -->

    public class Sql2008Attribute : Attribute
    {
        public string Description { get; private set; }
        public Sql2008Attribute()
        {
        }
        public Sql2008Attribute(string description)
        {
            this.Description = description;
        }
    }

Creating the Description property is optional, but it allows you to make a note to yourself to specify what it is you want to do one day.  Once you declare this attribute class in your codebase, you can decorate anything with it as a little reminder to yourself.

    [Sql2008("Use a table-valued parameter to execute all in one round-trip")]
    public void DeleteItems(List idList)
    {
        // Method splits list into batches of 50 and executes a stored
        // procedurethat can take up to 50 parameters.  This could
        // definitely benefit from a SQL 2008 table-valued parameter
        // that would allow sending all of the ids to the database
        // server in one round-trip.
    }

Once our database migration is complete, it will be easy for me to find all the code I'd like to update by right-clicking the Sql2008Attribute class definition, right-clicking, and selecting Find All References.
