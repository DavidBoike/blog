---
layout: post
date: 2013-01-21
title: 'RavenDB vs. RDBMS: Data Aggregation'
permalink: ravendb-vs-rdbms-data-aggregation
categories:
- Development
tags:
- RavenDB
- SQL Server
- RDBMS
comments: true
---
*Recently [Charlie Barker](http://www.dualbotic.com/DB/blog/) ([@Porkstone](https://twitter.com/porkstone) on Twitter) asked me what I felt were pros and cons of using RavenDB over a standard relational database. In this series of posts I highlight the differences between RavenDB and a RDBMS that I have experienced after completing three projects that incorporate Raven in some capacity.*

 The power of Map Reduce is phenomenal. I think the analogy that Ayende used at the RavenDB training I attended was the most apt.

Imagine you were trying to count up all the people in a skyscraper. How would you go about it? If you were SQL Server, you would send someone to every single room counting each person in turn. It would take forever, and then you'd throw that information away, so that the next person who wanted to know how many people were in the building would require the same effort of running floor to floor counting every single person.

<!-- more -->

That's not how RavenDB would do it. Raven would have one person from each room count the people from that room, and then one representative from each room would meet in a central location and the totals from each room would be summed. But the more impressive part is what happens if someone leaves the building, and you again want the count of people in the building. While SQL Server was busy running from floor to floor, RavenDB has kept tabs on the number of people in each room whenever someone enters or exits. Then only that room needs to be recounted, and the rest of the room totals do not have to be recalculated at all.

RavenDB 2.0, [which has just been released to market](http://ayende.com/blog/160642/ravendb-2-0-rtm), gets even smarter about map reduce, enabling scenarios such as multi-step reduce. Or in other words, the people from the rooms in each floor get together and create a per-floor total before the final building summation. There are many scenarios, such as blog posts per month, where historical data never changes, and multi-step map reduce is terrific for those scenarios.

### But Not All Aggregation

 Data aggregation in RavenDB does have its limits and they need to be understood. I tried to push it, and I should have realized things were getting too complex, but I didn't. Oops.

One of the projects included a game where users make weekly selections which are then scored, and you get a point for every correct response. My thought was that results would stream in from a data source and the always up-to-date nature of Raven would mean that the results of the game would always be up-to-date without any of SQL Server's penalty for large aggregate queries.

Thinking again about the transactionality of data, and for some reason harboring a grudge against the thought of creating too many small, unstructured documents, I decided to have a document for each week's worth of selections, thinking that after you made your selections for a week and they were scored, there's no reason for that document to ever change again, and thus would never need reindexing.

That's all well and good but it got complicated when it came time for scoring and ranking. My idea to have the scoring and ranking all done by Raven indexes led me toward [Transform Indexes or Live Projections](http://ayende.com/blog/4661/ravendb-live-projections-or-how-to-do-joins-in-a-non-relational-database), where at the indexing level you get access to a database session and can bring in information from other documents. Sounds neat and is very powerful, but do not abuse it!

So my index had to first project the weekly results into individual results, then bring in the result document for comparison, then filter out the incorrect picks, and then finally reduce down to a number of points. Expressing this as a LINQ construct within an index definition proved to be ridiculously complex, and I should have realized the code was starting to smell as I was writing it. Also, I learned later that when you do a Transform index in Raven, the transform part is done at query time, so you lose the "ready-to-go" aspect of the Raven index that really gives it its power.

That just covers scoring. For ranking I had to use an NServiceBus Saga to iterate through all the results from the index until there were no more (because in Raven you cannot do SELECT \*, you can only get a defined batch size) and then order all those results in memory to create a final results document for the week with the results of all the users who had played.

THIS IS A MESS!

The index method gave me nothing except for a complex, hard to maintain codebase. If I had to do this over again, I would realize that that all these single, well defined data points (user selections) are a perfect use case for SQL Server, and that for ranking, it would be a lot simpler to join the picks to the results, filter by correctness, aggregate into points, order by points descending, and then write this information to a results table.

In the next post I'll explore duplicating data: how SQL Server makes it difficult, how Raven makes it so much easier, and the types of use cases this opens up for us as app developers.
