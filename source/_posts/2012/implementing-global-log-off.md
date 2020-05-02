---
layout: post
date: 2012-01-09
title: Implementing Global Log Off
permalink: implementing-global-log-off
categories:
- Development
tags:
- security
- login
comments: true
---
Every year users are conducting more of their lives online, but they’re also doing so from more screens than ever before. It's not uncommon for me to access the same web application from my work computer, home computer, iPhone, and iPad, and those are just the devices that I consider “mine”. (Not that I own my work computer, but that I am its only user.)

If your web application contains anything of real value, the real danger comes from public computers that your users may use. It’s all too easy for a user to forget to log off from a website, and most webapps make it impossible to log off those sessions remotely.

I believe it’s becoming more important to allow your users the ability to globally log off from your website, clearing not only local credentials stored in cookies, but invalidating all the user’s sessions across all devices.

<!-- more -->

Some websites have already begun to do this:

-   Facebook allows you to [remotely log off from other devices](https://www.facebook.com/notes/facebook-security/forget-to-log-out-help-is-on-the-way/425136200765), although the functionality is hidden within the Security area under Account Settings, at least it is today. Facebook also shows the approximate location (based on IP) of the activity, as well as a device type. Sometimes this device type is something my mom could understand (Firefox on WinVista, Facebook for iPhone) but in other cases it displays a full browser user agent, which I believe is not helpful for the vast majority of Facebook’s users.  While that is nice for me as a geek, it’s probably overkill for most applications.
-   Stack Overflow (and the entire Stack Exchange network of websites) say on their Log Out page that “Clicking Log Out will clear all local credentials in your browser, and log you out on all devices.”

So how to implement global log off?

### Solution 1: Session Table

This solution would look a little like the Facebook example.

When the user logs in, write a session row to a database, including the User ID and Session ID. This could include the IP address, location, and user agent information like the Facebook example, but this is not required. Write a session cookie to the user’s browser containing Session ID, salted and encrypted of course.

When the user logs off, delete all session rows for the User ID in order to effect a global log off.

This solution has the advantage that you can support disabling individual sessions without killing off all of them.

### Solution 2: User Generation

A simpler solution is to add a Generation concept to your User information. This could be an integer (where every user starts at zero) or a Guid; it really doesn’t matter.

The user cookie should now include both the User ID and the Generation, again salted and encrypted.

Presumably every page request will use a (cached) User object of some type to render the obligatory “Welcome, David” user management header near the top of the page, if nothing else. When fetching the current user, the User object would be loaded by UserID, and then the Generation from the cookie is compared to the Generation in the object. If they match, the login is successful. If not, the cookie is invalid and is discarded.

When the user wants to globally log off, simply increment the Generation on the user object, and then all cookies referencing that User ID will be rendered invalid.
