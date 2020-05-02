---
layout: post
date: 2012-03-14
title: Configuring Hudson&#47;Jenkins to parse MSBuild output
permalink: configuring-hudson-to-parse-msbuild-output
categories:
- Development
tags:
- regular expressions
- continuous integration
- Hudson
- Jenkins
comments: true
---
When I started with continuous integration, I used [CruiseControl.NET](http://www.cruisecontrolnet.org/), but the XML configuration quickly got to be really tedious.

It didn’t take me long to switch to [Hudson CI](http://hudson-ci.org/).  It’s free, and it’s easily managed through an intuitive web interface. Not that I can’t grok XML configuration files; I’d just rather be spending my time building things instead of figuring out how to get them built.

For a primer on how to use Hudson CI for .NET projects, take a look at [Getting Started With CI Using Hudson For Your .NET Projects](http://blog.bobcravens.com/2010/03/getting-started-with-ci-using-hudson-for-your-net-projects/) by Bob Cravens, or *Continuous Integration with Hudson and .NET* ([dead link](http://refactor.tonoli.net/2009/12/04/continuous-integration-with-hudson-and-net/) - [snapshot from the Wayback Machine](https://web.archive.org/web/20160423021807/http://refactor.tonoli.net/2009/12/04/continuous-integration-with-hudson-and-net/)).

The only problem is Hudson is Java-based, so it’s not exactly plug-n-play when it comes to .NET, MSBuild, and Visual Studio. Particularly, when a build failed, I would have to scan through hundreds of lines looking for the cause of the error, which is difficult to do with CTRL-F when this line is completely normal:

    Compile complete -- 0 errors, 0 warnings

<!-- more -->

What is needed is the [Log Parser Plugin](https://wiki.jenkins-ci.org/display/JENKINS/Log+Parser+Plugin) (link includes formatting rules), which allows you to define regular expressions that determine how to interpret the lines of content in the MSBuild output, so that warnings and errors can be called out in different colors the same way that Visual Studio does. This plugin can be installed through Hudson’s built-in plugin manager, but you have to configure it yourself.


First, you need to create a text file on the server that hosts Hudson. If you have a cluster of servers, [this must be done on the master server](http://stackoverflow.com/questions/4285701/how-to-fail-a-hudson-job-if-a-certain-string-occurs-in-console-output#4304608).

Then, define the rules for the Log Parser Plugin to use. For this, it is helpful to have a reference of

[MSBuild / Visual Studio aware error messages and message formats](http://blogs.msdn.com/b/msbuild/archive/2006/11/03/msbuild-visual-studio-aware-error-messages-and-message-formats.aspx) handy.

Here are the rules that I came up with, which I saved to C:\\hudson\\VSParsingRules.txt:

~~~~

# Divide into sections based on project compile start
start /^------/
# Compiler Error
error /(?i)error [A-Z]+[0-9]+:/
# Compiler Warning
warning /(?i)warning [A-Z]+[0-9]+:/
~~~~

It’s really not complex.  A line starting with 5 dashes defines the start of a section where MSBuild starts building a project. Then there are rules to define an error and a warning.

Once this file is in place, go to Manage Hudson \> Configure System and enter the path to the rules file under Console Output Parsing. Then, in the configuration for each project, under “Post-build Actions”, check “Console output (build log) parsing” and select the appropriate rules from the drop-down.

Once the next build is finished, you will see a new “Parsed Console Output” link in the left-menu on each build.

One last tip: you will want to disable the Automatic Refresh setting (in the top-right corner of your browser window) while viewing parsed log output so that your screen doesn’t flicker and refresh every few seconds, causing you to lose your place.
