---
layout: post
date: 2011-07-10
title: Flexible Reporting with LINQ and C# 4.0 dynamic keyword
permalink: flexible-reporting-with-linq-and-csharp-4-0-dynamic-keyword
categories:
- Development
tags:
- source code
- LINQ
- dynamic
- .NET 4.0
- reporting
comments: true
---
It’s commonly very difficult to question business people about reporting requirements.  It’s not really their fault either – they just can’t know exactly what they want until they’re trying to answer a question and can’t easily do it with the reports you’ve given them.

This is why it’s good to make reports as flexible and updateable as possible, but with as little developer required to update the reports as possible.

If you’re operating in an environment where all database access must be via stored procedures, this is a really big problem.  It’s really unlikely that the changes requested by business can be implemented with the same stored procedure you naïvely created for your first attempt.  I’ve seen scenarios where a database has stored procedures with the suffixes GetReport, GetReport2, GetReport3, GetReport4, etc.  Yuck.

Even if you’re using Entity Framework, LINQ to SQL, or some other data layer framework that enables more free-form access to the database, you can’t always ensure that all report queries will result in good execution costs and actually be performant.

<!-- more -->

This is why it can sometimes be a good idea to perform a very basic database query (via stored procedure if necessary) to get a base set of data, and then perform more conditional operations on it in memory with LINQ.  It’s a pain to do a “Name Contains” filter in a stored procedure (especially if there are a dozen other options) but with LINQ it’s no big deal.

~~~~

IEnumerable data = GetBaseData();
if (!String.IsNullOrEmpty(nameFilter))
    data = data.Where(d => d.Name.IndexOf(nameFilter, StringComparison.OrdinalIgnoreCase) >= 0);
~~~~

This is really great for simple filters, but gets difficult when we want to do more complex grouping and aggregating functions, such as grouping by Hourly/Daily/Weekly/Monthly and/or by other data points.

The remainder of this article will show how this can be done with static code, and then how we can drastically increase the maintainability of this same code by employing the dynamic keyword introduced in C\# 4.0.

## The .NET 3.5 Way

Let’s consider the following data type.  It represents a simplified sort of reporting data you might see from an ad platform that is utilized on the web and also on mobile devices (iOS and Android).

~~~~

public class ReportData
{
    public DateTime Date { get; set; }
    public string Platform { get; set; }
    public string Size { get; set; }
    public int Views { get; set; }
    public int Clicks { get; set; }
}
~~~~

We want the ability to do any of these things independently or together:

-   Group Date by Hour, Day, Week, Hour, or an overall Summary
-   Group all platforms together
-   Group all sizes together

Of course, no matter what we do, we will always sum the Views and Clicks.

Let’s start with some code to generate quite a bit of random data and then show it to us:

~~~~

class Program
{
    static void Main(string[] args)
    {
        List data = CreateRandomData();
        Report("Raw Data, Top 10", data.Take(10));
        Console.ReadLine();
    }
    private static List CreateRandomData()
    {
        List data = new List();
        Random rand = new Random();
        DateTime start = new DateTime(2011,1,1);
        DateTime end = new DateTime(2011, 7, 1);
        for (DateTime dt = start; dt < end; dt = dt.AddHours(1))
        {
            foreach (string platform in new string[] { "Web", "iOS", "Android" })
            {
                foreach (string size in new string[] { "Standard", "Enhanced" })
                {
                    int views = rand.Next(0, 50);
                    int clicks = rand.Next(0, views / 3);
                    data.Add(new ReportData
                    {
                        Date = dt,
                        Platform = platform,
                        Size = size,
                        Views = views,
                        Clicks = clicks
                    });
                }
            }
        }
        Console.WriteLine("Generated {0} Sample Rows", data.Count);
        return data;
    }
    private static void Report(string label, IEnumerable data)
    {
        Console.WriteLine();
        Console.WriteLine(label);
        string format = "{0:MM/dd/yyyy HH:mm}   {1,-8}  {2,-8}  {3,6}  {4,6}";
        Console.WriteLine(format, "Date            ", "Platform", "Size", "Views", "Clicks");
        foreach (ReportData d in data)
            Console.WriteLine(format,d.Date, d.Platform, d.Size, d.Views, d.Clicks);
    }
}
~~~~

This results in the following output.  (The Views and Clicks will be different each time because they are generated randomly.)

~~~~

Generated 26064 Sample Rows
Raw Data, Top 10
Date               Platform  Size       Views  Clicks
01/01/2011 00:00   Web       Standard      15       2
01/01/2011 00:00   Web       Enhanced      34       1
01/01/2011 00:00   iOS       Standard      36       2
01/01/2011 00:00   iOS       Enhanced      20       5
01/01/2011 00:00   Android   Standard      44       8
01/01/2011 00:00   Android   Enhanced      29       4
01/01/2011 01:00   Web       Standard      45       9
01/01/2011 01:00   Web       Enhanced      30       7
01/01/2011 01:00   iOS       Standard      25       5
01/01/2011 01:00   iOS       Enhanced      47       9
~~~~

So how would we do this filtering statically?  For each item we want to group by, we have to do a combination GroupBy-Select that groups on everything ELSE.

Here is the example for Platform and Size, which are a lot simpler than for Date.

~~~~

private static IEnumerable ProcessVersion1(IEnumerable data, DateMode dateMode, bool platform, bool size)
{
    if(platform)
    {
        data = data.GroupBy(d => new
        {
            Date = d.Date,
            Size = d.Size,
        })
        .Select(g => new ReportData
        {
            Date = g.Key.Date,
            Platform = "All",
            Size = g.Key.Size,
            Views = g.Sum(d => d.Views),
            Clicks = g.Sum(d => d.Clicks)
        });
    }
    if (size)
    {
        data = data.GroupBy(d => new
        {
            Date = d.Date,
            Platform = d.Platform,
        })
        .Select(g => new ReportData
        {
            Date = g.Key.Date,
            Platform = g.Key.Platform,
            Size = "All",
            Views = g.Sum(d => d.Views),
            Clicks = g.Sum(d => d.Clicks)
        });
    }
    // Date to come later
}
~~~~

So to group all the Platforms together, we must group by Date and Size, then emit new data items that have “All” for the Platform, emit the Date and Size from the grouping key, and sum the Views and Clicks.  To group all Sizes together, we must group by Date and Platform, then emit new data items that have “All” for the Size, emit the Date and Platform from the grouping key, and sum the Views and Clicks.

In short, to group an axis together, you must (for the most part) focus on all of the OTHER axes.

It gets worse for a Date grouping:

~~~~

public enum DateMode
{
    Hourly,
    Daily,
    Weekly,
    Monthly,
    Summary,
}
private static IEnumerable ProcessVersion1(IEnumerable data, DateMode dateMode, bool platform, bool size)
{
    // Platform and Size, handled previously
    switch (dateMode)
    {
        case DateMode.Hourly:
            // No need to modify the data, we're assuming it comes from
            // the database already grouped by Hour
            break;
        case DateMode.Daily:
            data = data.GroupBy(d => new
            {
                Date = d.Date.Date,
                Platform = d.Platform,
                Size = d.Size
            })
            .Select(g => new ReportData
            {
                Date = g.Key.Date,
                Platform = g.Key.Platform,
                Size = g.Key.Size,
                Views = g.Sum(d => d.Views),
                Clicks = g.Sum(d => d.Clicks)
            });
            break;
        case DateMode.Weekly:
            data = data.GroupBy(d => new
            {
                Date = d.Date.Date.AddDays(-((int)d.Date.Date.DayOfWeek)),
                Platform = d.Platform,
                Size = d.Size
            })
            .Select(g => new ReportData
            {
                Date = g.Key.Date,
                Platform = g.Key.Platform,
                Size = g.Key.Size,
                Views = g.Sum(d => d.Views),
                Clicks = g.Sum(d => d.Clicks)
            });
            break;
        case DateMode.Monthly:
            data = data.GroupBy(d => new
            {
                Date = new DateTime(d.Date.Year, d.Date.Month, 1),
                Platform = d.Platform,
                Size = d.Size
            })
            .Select(g => new ReportData
            {
                Date = g.Key.Date,
                Platform = g.Key.Platform,
                Size = g.Key.Size,
                Views = g.Sum(d => d.Views),
                Clicks = g.Sum(d => d.Clicks)
            });
            break;
        case DateMode.Summary:
            data = data.GroupBy(d => new
            {
                Platform = d.Platform,
                Size = d.Size
            })
            .Select(g => new ReportData
            {
                Date = DateTime.MinValue,
                Platform = g.Key.Platform,
                Size = g.Key.Size,
                Views = g.Sum(d => d.Views),
                Clicks = g.Sum(d => d.Clicks)
            });
            break;
    }
    return data;
}
~~~~

Can you imagine how much of a mess it would be if we had to add a new property to this mix?  If we were to add another property that was similar to Platform or Size, we would need to reference it twice for each of the 4 date cases (in the GroupBy and in the Select) and then twice each for the existing Platform and Size groupings, not to mention its own grouping logic.  That’s 12 edit points needed to add one property!

That simply is not maintainable, and there must be a better way.

One answer to the Stack Overflow question [Dynamic LINQ GroupBy Multiple Columns](http://stackoverflow.com/questions/3929041/dynamic-linq-groupby-multiple-columns#3929455) suggests a way that would make this still possible *without* using dynamic code.  It involves making an EntryGrouper class that implements IEquatable and serves as the grouping key for the GroupBy operations.  While this method should work, it is by no means short, and would have to be re-implemented for every new use case.  The use of the dynamic keyword I present can be reused over and over.

## Introducing the dynamic keyword

[C\# 4.0 introduces the dynamic keyword](http://msdn.microsoft.com/en-us/library/dd264736.aspx) (and indeed a whole new dynamic runtime) that enables us to declare any properties we want on an object, and it is not evaluated until runtime.

Now, this isn’t completely magical – you could cast any object to a dynamic and it would compile, but at runtime there must be some mechanism to provide the values and methods you try to use.

Most of the time, we will use [System.Dynamic.ExpandoObject](http://msdn.microsoft.com/en-us/library/system.dynamic.expandoobject.aspx) to accomplish this for us.  ExpandoObject by itself is another statically-typed object that we cannot declare random properties on.  Only when we assign it to a dynamic variable does it get this power, but under the hood, the ExpandoObject essentially stores values in a Dictionary, and we can exploit that for our purposes.

By itself, ExpandoObject does not override GetHashCode() or Equals() from the base object, and LINQ’s GroupBy method needs this in order to do its work.  So first, we must create a wrapper that enables us to use the power of the dynamic keyword, compute equivalence and a hash code, and enable us to get back at the original data for the Select afterwards.

~~~~

public class DynamicHashWrapper
{
    public dynamic Value { get; private set; }
    private Dictionary dict;
    private HashSet keys;
    private static IEqualityComparer> keyComparer = HashSet.CreateSetComparer();
    public DynamicHashWrapper(dynamic value)
    {
        this.Value = value;
        dict = new Dictionary(value as IDictionary);
        keys = new HashSet(dict.Keys);
    }
    private int? hashCode;
    public override int GetHashCode()
    {
        if (!this.hashCode.HasValue)
        {
            int code = 0;
            foreach (var entry in dict.OrderBy(p => p.Key))
                code ^= entry.Value.GetHashCode();
            this.hashCode = code;
        }
        return this.hashCode.Value;
    }
    public override bool Equals(object obj)
    {
        if (!(obj is DynamicHashWrapper))
            return false;
        DynamicHashWrapper other = obj as DynamicHashWrapper;
        return keyComparer.Equals(this.keys, other.keys)
            && this.GetHashCode() == other.GetHashCode();
    }
}
~~~~

After creating a dynamic variable, we can wrap it with this class.  It does the following:

-   Stores the dynamic value itself so we can retrieve its properties back later.
-   Converts the dynamic ExpandoObject to a Dictionary that we can enumerate.
-   Enables computation of a hash code by XOR-ing the values of the dictionary.
-   Determines if two values are equal by ensuring that the dictionary sizes are equal and that the hash codes are equal.

With this addition to the dynamic object, we can now re-implement our data processing routine:

~~~~

private static IEnumerable ProcessVersion2(IEnumerable data, DateMode dateMode, bool platform, bool size)
{
    return data
        .GroupBy(d =>
        {
            dynamic key = new ExpandoObject();
            switch (dateMode)
            {
                case DateMode.Hourly: key.Date = d.Date; break;
                case DateMode.Daily: key.Date = d.Date.Date; break;
                case DateMode.Weekly: key.Date = d.Date.Date.AddDays(-((int)d.Date.DayOfWeek)); break;
                case DateMode.Monthly: key.Date = new DateTime(d.Date.Year, d.Date.Month, 1); break;
                case DateMode.Summary: key.Date = DateTime.MinValue; break;
            }
            if (!platform)
                key.Platform = d.Platform;
            if (!size)
                key.Size = d.Size;
            return new DynamicHashWrapper(key);
        })
        .Select(g => new ReportData
        {
            Date = g.Key.Value.Date,
            Platform = platform ? "All" : g.Key.Value.Platform,
            Size = size ? "All" : g.Key.Value.Size,
            Views = g.Sum(d => d.Views),
            Clicks = g.Sum(d => d.Clicks)
        });
}
~~~~

Now we have a single GroupBy and a single Select.  By the way, grouping and selecting only once means we should get a performance improvement because we aren’t generating a bunch of intermediate objects each time we do a grouping – we create one dynamic grouping key and spin through the collection only once.  Of course, the dynamic object probably has its own overhead from not being statically compiled, but the improvement in maintainability is WELL worth that small setback.

As a comparison, this new implementation takes 33 lines of code, whereas the original was 111 lines.  Who wants to try to maintain a 111-line method!?

Now we can try a bunch of different groupings and see them in action.

~~~~

static void Main(string[] args)
{
    List data = CreateRandomData();
    Report("Raw Data, Top 10", data.Take(10));
    Report("Group Platform", Process(data, DateMode.Hourly, true, false).Take(10));
    Report("Group Size", Process(data, DateMode.Hourly, false, true).Take(10));
    Report("Group Platform & Size", Process(data, DateMode.Hourly, true, true).Take(10));
    Report("Group All by Day", Process(data, DateMode.Daily, true, true).Take(10));
    Report("Group All by Week", Process(data, DateMode.Weekly, true, true).Take(10));
    Report("Group All by Month", Process(data, DateMode.Monthly, true, true).Take(10));
    Report("Group All Summary", Process(data, DateMode.Summary, true, true).Take(10));
    Report("Summary By Types", Process(data, DateMode.Summary, false, false).Take(10));
    Console.ReadLine();
}
~~~~

~~~~

Generated 26064 Sample Rows
Raw Data, Top 10
Date               Platform  Size       Views  Clicks
01/01/2011 00:00   Web       Standard      15       3
01/01/2011 00:00   Web       Enhanced      45       5
01/01/2011 00:00   iOS       Standard       9       1
01/01/2011 00:00   iOS       Enhanced       6       1
01/01/2011 00:00   Android   Standard       0       0
01/01/2011 00:00   Android   Enhanced       7       0
01/01/2011 01:00   Web       Standard      33       7
01/01/2011 01:00   Web       Enhanced       1       0
01/01/2011 01:00   iOS       Standard      28       7
01/01/2011 01:00   iOS       Enhanced      25       5
Group Platform
Date               Platform  Size       Views  Clicks
01/01/2011 00:00   All       Standard      24       4
01/01/2011 00:00   All       Enhanced      58       6
01/01/2011 01:00   All       Standard     105      14
01/01/2011 01:00   All       Enhanced      49       8
01/01/2011 02:00   All       Standard     133      13
01/01/2011 02:00   All       Enhanced      36       6
01/01/2011 03:00   All       Standard      95      16
01/01/2011 03:00   All       Enhanced      94      25
01/01/2011 04:00   All       Standard      58      14
01/01/2011 04:00   All       Enhanced      78       3
Group Size
Date               Platform  Size       Views  Clicks
01/01/2011 00:00   Web       All           60       8
01/01/2011 00:00   iOS       All           15       2
01/01/2011 00:00   Android   All            7       0
01/01/2011 01:00   Web       All           34       7
01/01/2011 01:00   iOS       All           53      12
01/01/2011 01:00   Android   All           67       3
01/01/2011 02:00   Web       All           55       0
01/01/2011 02:00   iOS       All           42      10
01/01/2011 02:00   Android   All           72       9
01/01/2011 03:00   Web       All           53      11
Group Platform & Size
Date               Platform  Size       Views  Clicks
01/01/2011 00:00   All       All           82      10
01/01/2011 01:00   All       All          154      22
01/01/2011 02:00   All       All          169      19
01/01/2011 03:00   All       All          189      41
01/01/2011 04:00   All       All          136      17
01/01/2011 05:00   All       All          142      17
01/01/2011 06:00   All       All          150      15
01/01/2011 07:00   All       All          181      33
01/01/2011 08:00   All       All          143      22
01/01/2011 09:00   All       All          208      34
Group All by Day
Date               Platform  Size       Views  Clicks
01/01/2011 00:00   All       All         3756     552
01/02/2011 00:00   All       All         3370     479
01/03/2011 00:00   All       All         3537     503
01/04/2011 00:00   All       All         3298     469
01/05/2011 00:00   All       All         3605     573
01/06/2011 00:00   All       All         3617     518
01/07/2011 00:00   All       All         3193     450
01/08/2011 00:00   All       All         3485     513
01/09/2011 00:00   All       All         3629     504
01/10/2011 00:00   All       All         3628     533
Group All by Week
Date               Platform  Size       Views  Clicks
12/26/2010 00:00   All       All         3756     552
01/02/2011 00:00   All       All        24105    3505
01/09/2011 00:00   All       All        24585    3495
01/16/2011 00:00   All       All        24618    3553
01/23/2011 00:00   All       All        24875    3471
01/30/2011 00:00   All       All        24845    3634
02/06/2011 00:00   All       All        24528    3391
02/13/2011 00:00   All       All        24561    3467
02/20/2011 00:00   All       All        24280    3621
02/27/2011 00:00   All       All        24614    3507
Group All by Month
Date               Platform  Size       Views  Clicks
01/01/2011 00:00   All       All       109101   15593
02/01/2011 00:00   All       All        98057   14078
03/01/2011 00:00   All       All       108231   15308
04/01/2011 00:00   All       All       106527   15286
05/01/2011 00:00   All       All       110096   15742
06/01/2011 00:00   All       All       106354   14982
Group All Summary
Date               Platform  Size       Views  Clicks
01/01/0001 00:00   All       All       638366   90989
Summary By Types
Date               Platform  Size       Views  Clicks
01/01/0001 00:00   Web       Standard  105615   14983
01/01/0001 00:00   Web       Enhanced  107740   15448
01/01/0001 00:00   iOS       Standard  107203   15417
01/01/0001 00:00   iOS       Enhanced  106457   15117
01/01/0001 00:00   Android   Standard  104772   14840
01/01/0001 00:00   Android   Enhanced  106579   15184
~~~~

## Summary and Code Download

With the static alternatives, we get a lot of spaghetti code that is impossible to maintain, and even if it was, the many GroupBy/Select iterations required for multiple axes result in unnecessary object creation, loops through the data collection, and eventual garbage collection.

Using the dynamic keyword and a small, reusable trick to enable the dynamic object to generate meaningful hash codes, we can loop through the data collection once.  Our results are just as good, and the next time someone visits this code, they’re much less likely to screw it up.

The code in this article is fairly fragmented. [DynamicReporting.cs](/downloads/DynamicReporting.cs.txt) - Click here to download the full source code.
