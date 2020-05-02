---
layout: post
date: 2010-07-17
title: 'Code-First Development with Entity Framework 4: Kicking the Tires'
permalink: code-first-development-with-entity-framework-4-kicking-the-tires
categories:
- Development
tags:
- Entity Framework
- SQL CE
- code first
- WebMatrix
comments: true
---
Yesterday [Scott Guthrie](http://weblogs.asp.net/scottgu/) wrote about the new "code-first" data access paradigm that Microsoft has released as an update to the Entity Framework, in his [blog post with the same name as this one](http://weblogs.asp.net/scottgu/archive/2010/07/16/code-first-development-with-entity-framework-4.aspx). (So I'm lazy!) I read it and was blown away. The speed, power, and elegance that this solution provides now (and will provide in the future after it matures out of CTP) looks like a big win for developers all over, but of course I had to download the bits and put it through its paces.

<!-- more -->

### Walk before you run

I decided to start off with a very basic test, a boring book and author example model:

    namespace EFTest.Model
    {
        public class Book
        {
            public int BookID { get; set; }
            public string Title { get; set; }
            public Author Author { get; set; }
        }
        public class Author
        {
            public int AuthorID { get; set; }
            public string FirstName { get; set; }
            public string LastName { get; set; }
            public ICollection Books { get; set; }
        }
        public class BookDB : DbContext
        {
            public DbSet Books { get; set; }
            public DbSet Authors { get; set; }
        }
    }

Scott Guthrie had used an MVC web application with [SQL CE 4](http://weblogs.asp.net/scottgu/archive/2010/06/30/new-embedded-database-support-with-asp-net.aspx) as the database back end. I wanted to try different things (and more importantly, didn't feel like installing SQL CE) so I created an ASP.NET Web Application Project and added a simple DataGrid to display the data with AutoGenerateColumns set to true.

Here are some initial observations:

-   You may want to define your database connection in Web.config before you get started. I started adding a book on every request, thinking that with no database backend, all the data would only be stored in memory. Wrong. My data was persisting even between recompiles, so obviously it was being stored somewhere! But where? Turns out my laptop has versions of Visual Studio 2005, 2008, and 2010 installed, and SQL Server 2005 and 2008. I'm not sure how, but the Entity Framework decided to find a SQL Server Express 2005 instance and created a database named "EFTest.Model.BookDB" (the namespace and class name of my DbContext class) on that instance even though I had not provided any connection string, although the default Web Application Project came with a connection string named ApplicationServices which did point to that instance. I'm not sure if that is how Entity Framework selected that database or not.
-   It's a little confusing and disconcerting to have these things happen to a database that's not a file-based database included in your Visual Studio project. I think it would be much more straightforward to be destroying and recreating included-in-project SQL Express or SQL CE databases, both of which can be easily upscaled to real SQL Server databases for QA and Production. (Later I'll show that not using a file-based database probably won't work in practice anyway)
-   The Entity Framework translated an undecorated string property into a nullable nvarchar(4000) in the database. Obviously you're going to want to decorate these with StringLength and Required attributes to fit your business requirements. These attributes are from the System.ComponentModel.DataAnnotations namespace, in the System.ComponentModel.DataAnnotations assembly.

### Time to kick the tires

So now that I've seen the basics in play, it's time to kick the tires and see what I can get it to do.

So first I added this line to the Application\_Start() method of Global.asax so that the database would be recreated whenever I change my model:

    void Application_Start(object sender, EventArgs e)
    {
        Database.SetInitializer(new RecreateDatabaseIfModelChanges());
    }

I added a bunch of types to see how they would translate to database types, recompiled, and then ran, only to get the following exception: **Cannot drop database "BookLibrary" because it is currently in use.**

OK. I guess this reinforces that it would be best to use a file-based SQL Express or SQL CE database contained in the solution. I tried changing the connection string to use a SQL Express Books.mdf database in my App\_Data folder. This worked great the first time, but then when I changed my model and tried to let it regenerate, I go the following exception: **Cannot open database "BookDB" requested by the login. The login failed. Login failed for user '(my login)'.**

I'm not sure if it's something I'm doing wrong, but at this point I'm a little frustrated, so I decide to [download SQL CE](http://www.microsoft.com/downloads/details.aspx?FamilyID=0d2357ea-324f-46fd-88fc-7364c80e4fdb&displaylang=en) and use [Scott's NerdDinner example](http://www.scottgu.com/blogposts/nerddinnerreloaded.zip) as a starting point and use that from here on out.

I also needed to download and install the [first preview beta](http://www.microsoft.com/web/webmatrix/download) of [WebMatrix](http://www.microsoft.com/web/webmatrix), because Microsoft has not yet shipped the update for Visual Studio that will allow us to manage SQL CE 4 .sdf databases in the Server Explorer tab. WebMatrix is installed through the Web Platform Installer, and was a 20 MB download.

I have to say, WebMatrix may be great for beginners, but for an experienced developer used to Visual Studio, it's just *weird*. I'll be very glad when Visual Studio integrates the SQL CE support.

### Fun with Types

Now that I'm using Scott's NerdDinners as a base, it's important to point out that for the SetInitializer call in Global.asax, Scott is defining a custom type NerdDinnersInitializer that inherits from the RecreateDatabaseIfModelChanges that I was using. This enables him to override the Seed() method to create default data when the database is recreated following a model change. You may want to [refer back to his article](http://weblogs.asp.net/scottgu/archive/2010/07/16/code-first-development-with-entity-framework-4.aspx).

Now my goal is to create a new model class and throw a bunch of different types in it to see how they get mapped to SQL types. Let's knock out most of the intrinsic value types and see what happens!

    public class TypeTest
    {
        public bool TestBool { get; set; }
        public byte TestByte { get; set; }
        public short TestInt16 { get; set; }
        public int TestInt32 { get; set; }
        public long TestInt64 { get; set; }
        public Single TestSingle { get; set; }
        public double TestDouble { get; set; }
        public float TestFloat { get; set; }
        public decimal TestDecimal { get; set; }
        public DateTime TestDateTime { get; set; }
        public Guid TestGuid { get; set; }
    }

Oops! **Unable to infer a key for entity type 'NerdDinnerReloaded.Models.TypeTest'.**

The Entity Framework is able to infer a primary key for Dinner and RSVP because (following convention over configuration) the classes have DinnerID and RsvpID properties. Fixing this is as easy as adding a TypeTestID property.

The mappings to database types is as you'd probably expect:

-   **.NET Type -\> SQL Type**
-   bool -\> bit
-   byte -\> tinyint
-   short -\> smallint
-   int -\> int
-   long -\> bigint
-   Single -\> real
-   double -\> float
-   float -\> real
-   decimal -\> numeric
-   DateTime -\> datetime
-   Guid -\> uniqueidentifier

I know, pretty boring. You could pretty much look that up on MSDN. All these value types emerged on the SQL end as their not-nullable counterparts.

I attempted to change every one of the primitive datatypes to their nullable counterparts by adding a ? to each type in the model. This worked as expected, switching each column to be nullable, but with one caveat: when I switched TestTypeID to int?, Entity Framework was again unable to infer a primary key. **Lesson: Entity Framework does not appreciate nullable primary keys.**

Next I tried replacing int, long, and byte with uint, ulong, and sbyte. The results were odd. For uint and ulong, no exception was thrown, but the properties were essentially dropped - they did not get translated into the database table. For sbyte, I received an exception about not being able to map the type. I tested all these in their non-null configurations. I didn't bother with uint? or ulong? or sbyte? because I really don't have many uses for these types in the first place. My development life is constrained by what you can put in a database, and you really can't put these types in a SQL Server database, so they have no usefulness to me.

Now for some more interesting types.

-   DateTimeOffset - throws exception!
-   DayOfWeek (simple enumeration) - Success! Maps to int
-   DayOfWeek? (nullable enum) - Success! Maps to nullable int
-   Enum based on byte - Success! Maps to tinyint. At this point, I'm going to assume that any enumeration that maps to a supported type will also be supported. **Not so fast, see update below.**
-   XmlDocument - ignored, no exception thrown. I was so hoping this would map to an xml column.
-   SqlXml - also ignored.
-   XDocument - also ignored. Not feeling good about any XML support at this point.
-   XElement - also ignored. OK I give up on XML.
-   byte[] - Maps to image type. This is weird to me because [Transact-SQL reference](http://msdn.microsoft.com/en-us/library/ms187993.aspx) says that image will be removed in a future version of SQL Server and that we should be using varbinary(MAX) instead. I wonder why the Entity Framework team chose to map to image?
-   char - ignored. I don't know why I didn't test this with primitives, so when I did I was shocked it didn't map to nchar(1). But really, who uses char columns anyway?
-   SqlGeography - ignored
-   SqlGeometry - ignored
-   SqlHierarchyId - ignored

> **UPDATE: A commenter alerted me that although enums appear to map correctly to the correct column type, if you attempt to execute any code with them, you will get a nasty exception that *"The entity type TheEnumType is not part of the model for the current context."* Hopefully this is a CTP-only issue and Microsoft plans to implement enums correctly in the near future.**

That's all the types I think of to test. I'm impressed that enumerations are taken care of so well. Although ideally I would like all of these types to map correctly out of the box, I'm most upset about any sort of support for xml column types.

### Many to Many Relationships

I had no idea if the Entity Framework could easily support Many to Many relationships but decided to throw out a simple idea and see what happened:

        public class Left
        {
            public int LeftID { get; set; }
            public string Name { get; set; }
            public virtual ICollection Rights { get; set; }
        }
        public class Right
        {
            public int RightID { get; set; }
            public string Name { get; set; }
            public virtual ICollection Lefts { get; set; }
        }
        public class NerdDinners : DbContext
        {
            public DbSet Lefts { get; set; }
            public DbSet Rights { get; set; }
            // other items
        }

Lo and behold, it worked! Here's the database structure that was created:

-   Table Left
    -   LeftID
    -   RightID

-   Table Right
    -   Name
    -   RightID

-   Table Lefts\_Rights
    -   Lefts\_LeftID
    -   Rights\_RightID

Very cool! I'm sure there's probably a way to customize the cross-reference table, but if you're in a hurry and don't really care too much, this is a really quick and painless way to get a Many to Many relationship.

### Creating a Hierarchy

It's also pretty simple to create a hierarchical object that has parent-child relationships.

        public class TreeNode
        {
            [Key]
            public int NodeID { get; set; }
            public TreeNode ParentNode { get; set; }
            public virtual ICollection ChildNodes { get; set; }
            public string NodeName { get; set; }
        }

Notice the [Key] attribute that declares NodeID to be the primary key, since it doesn't follow the conventions that would normally expect the name to be TreeNodeID.

What I can't figure out is how to define the column that stores the ParentNodeID. By default, the column generated is named ParentNode\_NodeID, which is pretty ugly.

The post [Data Annotations in the Entity Framework and Code First](http://blogs.msdn.com/b/efdesign/archive/2010/03/30/data-annotations-in-the-entity-framework-and-code-first.aspx) mentions a RelatedToAttribute that should address this problem, but the version in this post (dated March 30, 2010, so clearly preceding this newer release of Entity Framework) has different properties than the bits I downloaded, and I don't know how to bridge that gap.

### Going Forward

This is a pretty long post already, but there are still some things I'd like to explore at a later date.

-   I didn't really get the chance to actually use the code much, as I was primarily concerned with building the database schema from the model.
-   Scott says this version integrates better with stored procedures, although it is not immediately obvious to me how this would be done.
-   It would be interesting to test how well the Entity Framework cooperates with WCF RIA Services for Silverlight applications.

### Conclusion

For a Community Technical Preview, these Entity Framework bits are really impressive and I'm excited to get to try them out.

Here's what it needs before the RTM:

-   Provide mappings to and from SQL xml column types for the XmlDocument, XElement, XDocument, and SqlXml types.
-   The promised Visual Studio update to allow easier management of SQL CE databases within Visual Studio, and/or some documentation about how to get around the gotchas involved with using other SQL options.
-   A cookbook of how to achieve various design patterns by the application of attributes or fluent configuration.
-   XML documentation for IntelliSense for all the Entity Framework and Data Annotations attributes.
-   **Update: fully support mapping enumeration values. Right now the correct schema is generated, but the model does not support actually committing values.**

A big thanks to Scott Guthrie and his entire team. I'm looking forward to the next release!
