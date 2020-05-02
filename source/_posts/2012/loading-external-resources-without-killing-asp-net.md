---
layout: post
date: 2012-03-12
title: Loading external resources without killing ASP.NET
permalink: loading-external-resources-without-killing-asp-net
categories:
- Development
tags:
- NServiceBus
- source code
- jQuery
- Mustache
- ASP.NET
- external requests
- SignalR
comments: true
---
If you run an ASP.NET website with any non-trivial amount of traffic, the last thing you want to do is try to load an external resource with a web request. Even if you cache it, you've taken on that external source as a dependency to your system, which means that your website is only as reliable as the external source you depend on.

The primary strategy I've seen to cope with this is to request the data from the remote service on the first request from the web tier, cache it locally, and then have a background process periodically refresh that cache so that subsequent requests can use locally cached data.

Even with this background-updated cache, eventually the external resource will suffer some sort of issue. The data in the cache grows old and is invalidated, and then the web tier starts requesting the data again, except now, 100 different requests try to open 100 different connections to the remote service to get the exact same data, because either they all fail or none of them can complete quickly enough to store the cache item for the other threads to use. The Thread Pool fills up, and ASP.NET hangs its head and gives up.

<!-- more -->

## The Solution

Let's assume that we are talking about a current weather tease that is a small part of a very large page, and that all our current weather information for the end-user's zip code comes to us from an external provider.

So how do we avoid this mess? We can do it quite handily with a little [NServiceBus](http://www.nservicebus.com) and [jQuery](http://jquery.com/).

Do not even try to access the data during the standard page load. Instead, ship markup to the client that displays either an empty div or perhaps an AJAX loading spinner. Generate one [here](http://ajaxload.info/), [here](http://cssload.net/), [here](http://loadinfo.net/), or a variety of other places if, like me, you just don't do graphics.

Use jQuery to request the weather data from a web service on your own server, to be returned as JSON. This request should only look for locally cached data sources. If none are found, it should return a JSON response that says "Sorry, I don't have anything for you now. Please try back later." At the same time, the web page will use NServiceBus to send a DownloadRemoteWeatherDataCmd to a background service.

~~~~

public ActionResult GetCurrentConditions(string zip)
{
    var conditions = CurrentConditions.GetFromLocalSourcesOnly(zip);
    if (conditions == null)
    {
        // Really we should wrap conditions with a container that we
        // keep in cache, even if the value is null, where we can
        // keep track of how often we send this command, so that we
        // don't flood our back-end service with requests.
        Bus.Send(new DownloadRemoteWeatherDataCmd { ZipCode = zip });
    }
    return Json(new {
        hasData = conditions != null,
        conditions = conditions
    }, JsonRequestBehavior.AllowGet);
}
~~~~

While your client side has set a timeout to request the data again after a few seconds, the background process has received the DownloadRemoteWeatherDataCmd. Using a [Saga](http://www.nservicebus.com/Sagas.aspx), the endpoint manages duplicate requests (from multiple servers in the same server farm, for example) and makes sure that for each unique data request, only one request to the external resource is being made.

~~~~

public class CurrentWeatherSagaData : ISagaEntity
{
    public string ZipCode { get; set; }
    public DateTime DoNotDownloadAgainUntil { get; set; }
    // Required for NServiceBus Sagas - don't touch!
    public Guid Id { get; set; }
    public string OriginalMessageId { get; set; }
    public string Originator { get; set; }
}
public class RemoteDataAccessSaga : Saga&amp;amp;lt;CurrentWeatherSagaData&amp;amp;gt;,
    IAmStartedByMessages&amp;amp;lt;DownloadRemoteWeatherDataCmd&amp;amp;gt;
{
    public override void ConfigureHowToFindSaga()
    {
        this.ConfigureMapping&amp;amp;lt;DownloadRemoteWeatherDataCmd&amp;amp;gt;(
            data =&amp;amp;gt; data.ZipCode,
            cmd =&amp;amp;gt; cmd.ZipCode);
    }
    public void Handle(DownloadRemoteWeatherDataCmd cmd)
    {
        this.Data.ZipCode = cmd.ZipCode;
        if (DateTime.UtcNow &amp;amp;gt; this.Data.DoNotDownloadAgainUntil)
        {
            Bus.Send(new RateLimitedDownloadRemoteWeatherDataCmd {
                ZipCode = cmd.ZipCode
            });
            Data.DoNotDownloadAgainUntil = DateTime.UtcNow.AddMinutes(10);
        }
    }
}
~~~~

When the external request completes, the background endpoint stores the data locally (probably in a database) and publishes an INewWeatherDataAvailable.

~~~~

public class DataDownloader : IHandleMessages&amp;amp;lt;RateLimitedDownloadRemoteWeatherDataCmd&amp;amp;gt;
{
    public IBus Bus { get; set; }
    public void Handle(RateLimitedDownloadRemoteWeatherDataCmd cmd)
    {
        // Download the data from the weather provider
        // Then, insert it into the local database
        // Then, announce it to everyone who cares
        Bus.Publish&amp;amp;lt;INewWeatherDataAvailable&amp;amp;gt;(e =&amp;amp;gt; { e.ZipCode = cmd.ZipCode; });
    }
}
~~~~

The web tier subscribes to INewWeatherDataAvailable, and drops any cache items it might be holding. The next time the client side hits the web service, it will go back to the database and deliver the newly arrived data.

~~~~

public class CurrentConditionsCacheManager : IHandleMessages&amp;amp;lt;INewWeatherDataAvailable&amp;amp;gt;
{
    public void Handle(INewWeatherDataAvailable evt)
    {
        string zipCode = evt.ZipCode;
        // Now, drop any cache items related to this zip code
    }
}
~~~~

 

In the event of a downtime on the remote resource, compensating actions can be taken on the client side, depending upon business requirements. For example, the spinner could continue to spin indefinitely, or perhaps after 30 seconds, the spinner could be replaced by an apology message that the data couldn't be loaded right now. As disappointing as that might be, it's certainly better than an unresponsive web server or Error 503 Server Not Available.

## Extra Credit

This is a solid approach, but there are other things we can do to make it even better.

### Server/Client Templating

A valid criticism of this approach is that any content delivered via JSON cannot be indexed by search engines. In order to get around this, you can use a templating language that works on the server and the client.  [Mustache](http://mustache.github.com/)is just such a language, and is available for [JavaScript](https://github.com/janl/mustache.js) as well as [.NET](https://github.com/jdiamond/Nustache).

On the server side, if data is available, render the data to HTML so that Google can index it. If it is not, fall back on the AJAX loader image and include the template so that it can be populated the exact same way on the client.

### Async Signaling

Once the INewWeatherDataAvailable arrives at the web server, why wait for the client to check back for the update when we can push the data straight to the client? SignalR provides us with the ability to push data directly from the server to the client when it arrives.
