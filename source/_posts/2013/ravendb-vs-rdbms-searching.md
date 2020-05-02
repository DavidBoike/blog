---
layout: post
date: 2013-02-06
title: 'RavenDB vs RDBMS: Searching'
permalink: ravendb-vs-rdbms-searching
categories:
- Development
tags:
- RavenDB
- RDBMS
- search
- suggest
- geo
- boosting
- More Like This
comments: true
---
*Recently [Charlie Barker](http://www.dualbotic.com/DB/blog/) ([@Porkstone](https://twitter.com/porkstone) on Twitter) asked me what I felt were pros and cons of using RavenDB over a standard relational database. In this series of posts I highlight the differences between RavenDB and a RDBMS that I have experienced after completing three projects that incorporate Raven in some capacity.*

Originally I wrote this series as 4 posts, after which my boss read the series and asked me a bunch of pointed and very interesting questions. These made me realize I forgot this very important advantage that Raven has over pretty much any relational database out there – searching!

Why did I forget about it? Because I was approaching the blog series from the perspective of things both Raven and a relational database do, and how they did them. But relational databases really don't do searching, at least, not with the same level of basic competence that they store data. My last experience was with Microsoft SQL Server Full Text Search and it wasn’t fun. If you’ve tried, you [probably know what I’m talking about](http://programmers.stackexchange.com/questions/84592/why-dont-databases-have-good-full-text-indexes). If not, you don’t have to take my word for it – take it from [these guys](http://blog.stackoverflow.com/2008/11/sql-2008-full-text-search-problems/) instead.

<!-- more -->

Because of these problems, most people who need to do some sort of search turn to a search index product, such as [Lucene](http://lucene.apache.org/core/)and [SOLR](http://lucene.apache.org/solr/). I’ve developed search solutions with SOLR myself. It’s a Java service you run in Tomcat that provides search services via a REST API, and it can be harder to set up than it sounds, unless you’re proficient in [DisMax](http://wiki.apache.org/solr/DisMaxQParserPlugin) index tuning. I was not. We were eventually forced to bring in a SOLR consultant in order to get the sort of relevance matching in our search results that our business stakeholders expected. It turns out that Google is your enemy here – they make searching look *too easy* and then your users start to assume that it actually is.

RavenDB takes the crazy approach of baking search right into the database by building their entire indexing infrastructure on top of Lucene, but then they provide a slick .NET LINQ-ified API on top of it. You don’t need to manage complex schema XML files, and you don’t need to manually keep your search index up to date. As you add documents to your database, Raven automatically reindexes those documents, keeping the underlying Lucene indexes fresh.

Once your data is indexed with Lucene this way, it opens up all sorts of interesting possibilites.

## Full Text Search that Works

 When your index (which you construct using C\# code) specifies that a field is analyzed for searching, you can magically do full text searching on it.

    var results = s.Query()
        .Where(f => f.Name == "David Boike")
        .ToList();

 Assuming the Name property is analyzed, the database is no longer performing a straight equality comparison. It is rooting words and doing all the things that search indexes do. This means that “Dave” will also be found. Results are ordered by the relevance field, which you can also return and show to your user.

If you need more, you can tap into the power of Lucene for multiple field searches:

    var results = s.Advanced.LuceneQuery()
        .Where("FirstName:David LastName:Boike")
        .ToList();

 For more information, take a look at the RavenDB documentation for [Query and LuceneQuery](http://ravendb.net/docs/2.0/client-api/querying/query-and-lucene-query).

## Suggest

 So that stuff is nice, but you could probably accomplish that with SQL Server, it just wouldn’t be as easy or as fast. How about something SQL Server could never do?

My mother is a 3rd grade teacher and she chastises her students for relying on a word processor’s spell checker. It’s not going to catch when you’re writing about your favorite movie “The Loin King”. But if you [search Google for “The Loin King”](https://www.google.com/search?q=The%20Loin%20King), what does it say? It says “Showing results for “The **Lion** King”.

Google is smart. Raven allows you to be smart too. It includes a Suggest API so you can execute your search, then check the number of results, and if you return none, ask the database for suggestions about what the user could have meant based on current data.

Then you have a choice. Maybe there’s one suggestion and, like Google did for The Loin King, you can just redirect. Maybe you can present the user a list of possibilities and let them choose. Either way, Raven gives you the power to be like Google.

For more details check out [Ayende’s post on Raven Suggest](http://ayende.com/blog/4696/raven-suggest), and for even more cool things you can do with Suggest, check out [Full Text Search takes you only so far](http://ayende.com/blog/122881/full-text-search-takes-you-only-so-far).

## Simple search without sacrifice

 Have you ever seen an advanced search form that contains 20 different text boxes for searching different fields in a complex data set? Do you know anyone who would really enjoy using such a thing?

Me either.

The best searches on the planet all have just one text box and it does everything. SOLR search indexes give you the ability to do this through a structure that essentially says “Take the contents of all these fields and copy them into this imaginary field I will call Query.” Being built on the same foundation as SOLR, Raven can do that too.

Simply define an index for returns a property Query, which is an array of objects  - the objects are all of the different fields that must be searchable.

I could show you a complete example but Ayende has already done a great job of that. He is the master, so I’ll defer to him. Go check out his post [Orders Search in RavenDB](http://ayende.com/blog/152833/orders-search-in-ravendb).

## Geo Searches

 I feel the need to mention geo-spatial searches, since it is part of searching. I have done this with SQL Server 2008 and found it to work adequately, but have not yet had the opportunity to explore spatial searches with RavenDB. If this topic is of interest to you, check out Ayende’s blog series on the topic:

-   [Part I: Setup](http://ayende.com/blog/156385/geo-location-amp-spatial-searches-with-ravendbndash-part-indash-setup)
-   [Part II: Modeling](http://ayende.com/blog/156386/geo-location-amp-spatial-searches-with-ravendbndash-part-iindash-modeling)
-   [Part III: Importing](http://ayende.com/blog/156417/geo-location-amp-spatial-searches-with-ravendbndash-part-iii-importing)
-   [Part IV: Searching](http://ayende.com/blog/156418/geo-location-amp-spatial-searches-with-ravendbndash-part-iv-searching)
-   [Part V: Spatial Searching](http://ayende.com/blog/156449/geo-location-amp-spatial-searches-with-ravendbndash-part-v-spatial-searching)
-   [Part VI: Database Modeling](http://ayende.com/blog/156705/geo-location-amp-spatial-searches-with-ravendbndash-part-vindash-database-modeling)
-   [Part VII: Client vs. Separate REST Service](http://ayende.com/blog/156706/geo-location-amp-spatial-searches-with-ravendbndash-part-viindash-ravendb-client-vs-separate-rest-service)

## Index Boosting

 Frequently when designing a search solution you will want to say that one field is more important than another. If a word or phrase matches in a Title, then that's a better match than if it matches in the Keywords, which is still a better match than if it occurs in the 17th paragraph of text.

SQL Server, of course, cannot do this. Lucene and SOLR can, of course, but it can be a pain to set it up. In Raven you specify these right in your index definition in C\# code, right where you like to live anyway.

Raven provides the ability to do field level boosting (e.g. a Title match is better than Keyword match) but also the entire document based on whatever you can define in code. This is very useful for situations like content publishing, where you want the search to prefer newer content over old, everything else being equal. With document-based boosting, you can use a function that declines logarithmically with age so that the relevance of your documents gradually declines over time.

For more information, see [Ayende's boosting post](http://ayende.com/blog/153185/ravendb-index-boosting) or the [RavenDB Documentation on Boosting](http://ravendb.net/docs/2.0/client-api/querying/static-indexes/boosting).

## More Like This

 The ability to find and link to similar content (without any direct user involvement like manual linking or maintenance of tags or something similar) is a very powerful concept. In publishing, providing links to related content can drive more page views per visitor, longer session time, and by extension, more ad impressions and profit.

In other arenas, the capability to search for More Like This means that you only have to get *close* to the thing you really want, and once you do, it becomes easier to find the true target.

In any case, with SQL Server you would have to roll your own More Like This implementation in every scenario, but with RavenDB you can get it more or less out of the box.

For more information, check out the [RavenDB Documentation on More Like This](http://ravendb.net/docs/2.0/server/bundles/morelikethis). Keep in mind that in RavenDB 1.0 builds, this was provided as a plugin that was required a server and client component, so most people didn't have it turned on by default. However in RavenDB 2.0 most of these core bundles have been made easier to include on a per-database basis within one RavenDB server, making it much easier to roll out this feature.
