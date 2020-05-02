---
layout: post
date: 2017-01-31
title: "Inbox Few - How I wrangle my email"
permalink: inbox-few-how-i-wrangle-my-email
comments: true
categories:
- Development
tags:
- Gmail
---

I used to be a practitioner of Inbox Infinite. The incoming messages would just land at the top of my inbox, and as I scrolled down, the date of the email would slowly get closer and closer to the date when I originally opened my Gmail account.

Let's just say I could scroll down a long damn way.

My primary method of determining if something was *handled* was whether or not it was read. If I needed to look at it later, mark it as unread. It worked out alright, as a software developer I didn't get that much email to start with, and work generally happened only during work hours.

When I joined [Particular Software](https://particular.net) it became quickly apparent that how I managed my email was going to have to change.

<!-- more -->

Particular Software is a 100% dispersed organization with no "home office." We have people in North America, Europe, and Australia. The sun never goes down on us, and so throughout most of the week, during every hour of the day, someone *somewhere* is working.

We also do all our work in GitHub, from work on code in our public repositories, right down to discussing changes to our parental leave policy.

This results in *lots of notification emails*. The problem isn't just dealing with them in my inbox. I also need to curtail the sheer amount of them that are archived so that I have a remote chance of finding anything *else* in my email.

So here's the system I've come up with to wrangle my email. I'm not necessarily saying it will work for you, but I've found it works for me.

## Basic setup and filters

I like to use a native Mail client, not the Gmail web interface, especially since I prefer to blend my personal and work email together into one experience. I actually really like Apple's built-in Mail app when I'm on my MacBook Pro.

So the first thing I had to turn off is Gmail's tabbed email system that separates Social/Promotions/Updates/Forums content into different tabs in the Gmail web interface, because it doesn't do any good from a native client.

Instead, I set up filters to map this kind of stuff to labels/folders in Gmail. You can take advantage of Gmail's intelligence to identify these messages and direct them where you want.

Using the searches `category:social` and `category:promotions`, you can create Gmail filters to move these to separate labels, skip the inbox, and never mark it as important. I direct these to labels called **Notifications** and **Notify**, and this cleans up an amazing amount of what would otherwise land in my Inbox.

I frequently skim these folders once per day, and mark them read en masse.

I also have another Gmail filter for advertising that somehow makes it through Gmail's algorithms. The search is along the lines of `from:(A OR B OR C OR ...)` and I add to it as necessary. Honestly though, I can't remember the last time I amended that filter. Gmail seems to be really good at that.

Lastly, I have a filter for `from:notifications@github.com` that applies a **GitHub** label, but here I do *not skip the Inbox*. More on this later.

## Inbox Few

It didn't take long after joining Particular to realize that using Read/Unread status on a message to keep track of what I needed to do with it would not work. I just get too many GitHub notifications.

Particular Software creates a messaging product called NServiceBus, so it made sense to treat my Inbox as a persistent queue. If it's in my inbox, that means there's something there for me to do. If there isn't anything for me to do, it shouldn't be in my inbox.

I tried Inbox Zero, but found it impossible to get to zero. I'm not sure if that would even be a good thing. If I didn't have anything to do in my persistent queue, that might be bad for job security?

In any case, I've settled on Inbox Few. When I seriously triage my email, I try to tackle small, achievable tasks that I can quickly dispatch, in any order that happens to suit my fancy. Sometimes, this is just typing a quick response on a GitHub issue to voice my opinion. Other times it involves a little more work, but never an hour-long task. If something is too big of a time suck, I leave it alone. It will probably need its own period of undivided attention anyway, so I leave it until I can devote that time to it.

I keep going at this roughly until the scrollbar on my message list disappears and I can see all the remaining messages in one view. This is a highly subjective measure of course. I have my email client set up in the Folders On Left + Message List On Top + Message Preview On Bottom configuration, and I don't maximize my email client to the whole screen. At this moment, I have 11 items in my Inbox and I'm feeling very good about that.

Once I get down to roughly this scale, what's left can fit in my head and I can start to make better value judgments about what Big Ticket task is truly worth my time and then start on that. Usually I'll also take a scan of the [GitHub issues assigned to me](https://github.com/issues/assigned) and take that into consideration.

I also try, whenever possible, to eliminate items where I'm waiting for something. In most GitHub issues, I trust there will be some further activity from one of my teammates that will "wake me up" with a new notification. However, in some situations that isn't likely to happen, so in those cases I'm quick to use [Slack's reminder feature](https://get.slack.help/hc/en-us/articles/208423427-Set-a-reminder) to point me back to a specific issue URL at some time in the future.

I feel the biggest hole in this process is currently when I expect that someone else will reply to an issue, giving me my wake-up call, but it never happens. This is when I run the risk of forgetting about an issue for an extended period of time, especially if I'm not assigned to it. I'm currently not sure how to address that.

## Cleaning up cruft

Sometimes I'll want to find something useful in my email, and for that I have to rely upon search. It really doesn't help if there are hundreds of GitHub notifications, ads, or other cruft gumming up everything, turning my signal-to-noise ratio to utter crap.

But on the other hand, I don't want to get rid of these emails immediately, especially the GitHub notifications. After I archive a message, if someone later responds on that issue, it raises the entire thread back into my Inbox. This way I can see most of the context right there in my email client, and I don't have to waste half of my day launching into a GitHub browser window only to find out which issue that was anyway.

To deal with this, I use a [Google Apps Script](https://www.google.com/script/start/) to delete email conversations out of Gmail after a certain period.

These scripts are really easy to make. They are stored in Google Drive, so you just go to the link above and click the **Start Scripting** button. Save it in a Drive folder and you can set it up to run once per night without having to hassle with a crontab or anything.

Here's my script that archives messages with the *Notify* and *Advertising* labels after 30 days, which is plenty long enough to retrieve a coupon the day my wife wants to go shopping. It also archives messages in the **GitHub** label (remember that from earlier?) after 180 days.

```
function archive(label, days, trash) {
  var query = 'label:' + label + ' is:read older_than:' + days + 'd';
  var emails = GmailApp.search(query, 0, 500);
  Logger.log('Folder "' + label + '": retrieved ' + parseInt(emails.length, 0) + ' emails to ' + (trash ? 'delete.' : 'archive.'));
  for(var i=0; i<emails.length; i += 100) {
    var batch = emails.slice(i, i + 100);
    Logger.log('...Processed ' + parseInt(batch.length, 0) + ' threads.');
    if(trash) {
      GmailApp.moveThreadsToTrash(batch);
    } else {
      GmailApp.moveThreadsToArchive(batch);
    }
  }
}

function main() {
  archive('notify', 30, true);
  archive('advertising', 30, true);
  archive('github', 180, true);
}
```

Through the clock-ish icon in the script editor, you can schedule this script to run the `main` function on a scheduled basis. Mine runs daily between midnight and 1am in order to make sure the batch size doesn't exceed the 500 allowed by the script. (If you try to make that larger, the script can fail.) When I originally created it, I had to run it manually many *many* times to get through all the junk in my previous Inbox Infinite.

You may notice the script has an option for archiving messages that I'm not currently using. If you, like me, are currently at Inbox Infinite, you can apply a label to all the messages in your Inbox, and then use that label to archive messages until you get from Inbox Infinite down to at least Inbox Semi-Recent.

## Summary

As I said at the outset, this may not work for everybody, but it seems to be working pretty well for me. I always have a persistent task list available to me, which I can manage from my laptop or from my phone in a similar fashion. It also allows me to do high-level triage of "Yep, got it" type things easily from my phone during downtime when I would be bored anyway.

Some have suggested I use Google Inbox instead of all this, especially because the "Snooze" feature might help with the problem of getting a message out of the way but coming back to it later, whether or not anyone has replied.

My problem with that is that I like email and how it's set up, I just want it to work for me. I don't see the need to totally reimagine it, nor do I want to give up my native client for a webapp, or have to try out a bunch of native Inbox clients like [Boxy](http://www.boxyapp.co/).

Basically, what I've got now seems to be working out fine. Why would I mess with that?
