---
layout: post
date: 2010-10-11
title: 'HgRemote: Extending Mercurial to Non-Developers'
permalink: hgremote-extending-mercurial-to-non-developers
categories:
- Development
tags:
- source code
- Fog Creek
- kiln
- Mercurial
- open source
comments: true
---
I hear lots of stories about how designers and developers can't get along. Personally, I don't get it. I love our web designers. They do something I can't. I don't do pretty. I can design a user interface and make it functional, but that's not enough. Our designers can turn that around and make it gorgeous. We complement each other, and I try to take care of them whenever I can.

So when we made the leap from self-hosted Subversion to [Kiln-hosted Mercurial](http://fogcreek.com/kiln/), I wanted to better integrate our designers in the development process. I wanted them to have the same advantages of version control that I, as a developer, was accustomed to. And I really wanted to put an end to opening directories and finding "default.aspx", "default - Copy.aspx", "default - Copy (2).aspx", etc.

The problem with Mercurial is that it doesn't work too well for web designers that don't have a locally hosted webserver on their workstation. When testing a bunch of CSS changes, an "edit, save, commit, push, refresh, check, repeat as necessary" workflow does not work. Designers need to be able to modify files on a shared design webserver where they can preview their changes immediately and then commit when done with a task.

Additionally, the designers only need access to the website directory, and attempting to do a 3-way merge makes them run for the hills. And why wouldn't it - I don't even enjoy *that*.

So like most developers, I figured there must be a way I can fix this problem with software.

<!-- more -->

#### Introducting HgRemote

I started a [new open source project](http://hgremote.codeplex.com/) (under the Apache License 2.0) called HgRemote. It's a client/server application that communicates via WCF.

![HgRemote Screenshot](/images/hgremote.png "HgRemote Screenshot")

The client application is designed to mimic the TortoiseHg commit window. Developers familiar with TortoiseHg will have a built-in familiarity with it which will help when training in or helping non-developers.

The server application can be easily installed as a service, thanks to the [Topshelf Project](http://topshelf-project.com/), and performs command-line Mercurial tasks on behalf of the client application.

The interface allows users to commit, add, forget, visual diffs, and even push, pull, and perform custom configured tasks.

HgRemote is NOT a fully-featured Mercurial client, or even really a finished product. It doesn't even have an application icon! However, it does provide the most useful, basic subset of commands to allow a non-developer to participate fully in a development team, and it has lots of room to grow.

Please, check out the project at [http://hgremote.codeplex.com/](http://hgremote.codeplex.com/), take it for a test drive. If you like it, fork it and add a new feature.

Just a few possibilities:

-   File/repository status
-   Add preferences for WCF network credentials. Currently either client and server must be in the same domain, or the binding transport security must be set to None in the WCF configuration.
-   Add an application icon!
-   Enable parameters on Tasks.
-   Enable additional contextual menu items in file list that are available in TortoiseHg.
-   Many more...

