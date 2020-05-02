---
layout: post
date: 2010-08-12
title: Batch or Partition a collection with LINQ
permalink: batch-or-partition-a-collection-with-linq
categories:
- Development
tags:
- source code
- LINQ
- C#
comments: true
---
Since Generics were first introduced with .NET 2.0 I have had a utility method I used to batch a list into smaller lists of a fixed size, usually to batch up a bunch of database inserts into manageable groups of 10 or 25 or so.

Today I needed to do the same thing except I will be dealing with a potentially VERY large data set with some fairly complex computations built in. Forcing it all into a list and batching the list means I will have to hold all of that garbage in memory.

So I started looking for a LINQ implementation that would deal with only one batch at a time and keep the memory footprint low. <!-- more --> I found very little - everything under a [Google search for "LINQ batch"](http://www.google.com/search?q=LINQ+batch) seemed to be about operations with LINQ-to-SQL. Don't care.

I found [Split a collection into n parts with LINQ?](http://stackoverflow.com/questions/438188/split-a-collection-into-n-parts-with-linq) on Stack Overflow but was horrified by some of the algorithms there. They all seemed to commit at least one unforgivable sin:

-   Extensive use of division or modulus, although I can let this slide because the question was how to divide an unknown sized collection into X equal parts, as opposed to my desire to return an unknown number of identically-sized parts.
-   Accessed the Count() of the collection
-   SUPER long and/or complex
-   Created tons of intermediate objects.
-   Rendered the collection to a list or something that would cause massive computation

What is needed is simply take a few, and keep track of your place.

Here was my first solution. **(DO NOT USE THIS! IT IS BAD!)**

    // INEFFICIENT! DO NOT USE!
    public static IEnumerable<T> Batch<T>(this IEnumerable<T> collection, int batchSize)
    {
        IEnumerable<T> remaining = collection;
        while(remaining.Any())
        {
            yield return remaining.Take(batchSize);
            remaining = remaining.Skip(batchSize);
        }
    }

Turns out this is horrible. Apparently you have to be careful when combining the different LINQ operators together. Performance testing showed that the first few batches are returned quickly, but each successive batch returned takes longer and longer to complete, resulting in an algorithm that takes exponentially longer as your collection size increases.

So instead, here is a solution that scales up well. I guess you could call it back to basics.

    public static IEnumerable<T> Batch<T>(this IEnumerable<T> collection, int batchSize)
    {
        List<T> nextbatch = new List<T>(batchSize);
        foreach (T item in collection)
        {
            nextbatch.Add(item);
            if (nextbatch.Count == batchSize)
            {
                yield return nextbatch;
                nextbatch = new List<T>(batchSize);
            }
        }
        if (nextbatch.Count > 0)
            yield return nextbatch;
    }

Sometimes the simplest, shortest, most to-the-point solutions (without any fancy black boxes or tricks) are the best ones.
