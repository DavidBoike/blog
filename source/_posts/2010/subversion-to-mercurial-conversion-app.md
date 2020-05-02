---
layout: post
date: 2010-06-23
title: Subversion to Mercurial Conversion App
permalink: subversion-to-mercurial-conversion-app
categories:
- Development
tags:
- source code
- Fog Creek
- kiln
- Mercurial
- Subversion
comments: true
---
On my team, we use [FogBugz](http://www.fogcreek.com/fogbugz/) for case/defect tracking and project management, and we absolutely love it.

So when the folks over at [Fog Creek](http://www.fogcreek.com) created [Kiln](http://www.fogcreek.com/kiln/) for version control with integrated code review, we had to try it out, and once I tried it, I knew we had to have it.

Of course, Kiln is based on Mercurial, and in order to convert, we have a fairly large Subversion repository that we need to convert. At least, at over 4000 revisions and still growing, it feels pretty big to us.

(If you have no idea what Kiln or Mercurial is all about, I encourage you to check out [Hg Init](http://hginit.com/), a tutorial on Mercurial written by [Joel Spolsky](http://joelonsoftware.com/), which is extremely informative and well written.)

Fog Creek provides an import tool that is pretty impressive, since it is able to do import from half a dozen different existing source control systems (including just a pile of files on disk) and does it pretty well. However, it didn't meet our needs in a few areas:

<!-- more -->

-   It doesn't take advantage of author mapping offered by the hg convert utility. Our current Subversion server (VisualSVN Server) uses our Windows credentials, which are based on an archaic corporate naming scheme, so we really would like to map these to our real names.
-   The conversion is imperfect, resulting in some directories and files that aren't in the head of the Subversion trunk turning up in the converted Mercurial repository. These are directories that existed long ago, before a massive repository reorganization moved them elsewhere. In any case, we don't want them, and we don't necessarily want to hunt them down manually.
-   The conversion doesn't convert Subversion's svn:ignore properties into an .hgignore file. When you're developing with Visual Studio 2008 and a large solution, that results in a bunch of untracked bin and obj directories.
-   Although this turned out not to be important for us, the importer does not allow carving a large Subversion repository into a bunch of smaller subrepositories.

I developed a Windows Forms application in C\# to handle our conversion, and learned a lot about the command-line svn and hg commands along the way. I offer it to you in the hopes that you might find it useful, because there is no greater tragedy than code that is written and only executed once.

I warn you, the application is NOT what I would call polished source code or UI. It's REALLY rough around the edges. It was designed experimentally to get a job done that only had to be done once. Niceties were not observed. Sorry! And of course I make no warranties that it will work for you, AT ALL!

That said, here's the link:

-   [HgImport](/downloads/HgImport.zip) - A Visual Studio 2008 project for an SVN to Mercurial import application
-   *Requires the pre-.Net-4.0 Task Parallel Library extensions*

Here's how to use it:

-   You must enable the hg convert extension:
    -   Edit your .hgrc file in your user folder ... which if you're using Kiln on Windows, may be called Mercurial.ini instead.
    -   Find the [extensions] section of the file, and add the line "hgext.convert=" (without the quotes) underneath.
    -   All this does is enables the convert command on the command line. See the [Mercurial ConvertExtension](http://mercurial.selenic.com/wiki/ConvertExtension) documentation for further details.

-   Build and run the application.
-   Switch to the Author Map tab and enter your username mappings. Each line should take this format:
    -   oldusername = Firstname Lastname

-   I don't save that text anywhere. Copy and paste it into a text file for safekeeping. Now switch tabs back.
-   Enter your Subversion repository trunk url in the text box. (Sorry, we are just converting our trunk. All our branches are dead and we want to be rid of them. You're welcome to change the code if you like!)
-   Click the Load SVN button. Sorry if your repository requires login. My app doesn't support it. I warned you it was rough around the edges! You can either modify the source or do what I did: use the svnsync command to sync your central SVN repository server onto a mirror repository on your local computer. This has the added benefit of speeding the conversion process by taking the network out of the equation.
-   Check any directories that you want to convert into subrepositories. (Since I abandoned this feature, this is NOT well tested! Especially the .hgignore doesn't take subrepositories into account.)
-   Click Convert and then go get a snack. I estimate approximately one snack per thousand SVN revisions, or one full meal per 5000 revisions. Just ballpark figures.

Here's what the conversion process does:

-   When you load the SVN repository, it loads the SVN head file structure into an XML document in memory.
-   When you begin conversion, first it clears out the working directory. ("working" under the execution directory)
-   Next, the app performs a full convert of the SVN repository using "hg convert", similar to what the Kiln import tool does, although the authors are mapped at this point.
-   Next, the app updates the Mercurial repository with "hg up" to essentially establish the working copy.
-   Next, the Mercurial working directory is compared recursively with the SVN-exported XML file structure. This creates a filtering list that eliminates the phantom directories and files that no longer exist in the SVN working copy.
-   Next, the intermediate Mercurial repository is converted to the final Mercurial repository using "hg convert", utilizing the previously created filter, and then the final repository is updated with "hg up".
-   If you selected subrepositories, the filtering file will also exclude those directories, and then the app will attempt to repeat the process of converting each subrepository out of the transitional repository. Like I said, I gave up on this feature and this will definitely not work with .hgignore, if it even works at all!
-   Lastly, the app will query the SVN repository for svn:ignore properties, and translate these into an .hgignore file in the root of your new Mercurial repository. Then this file will be added with "hg add" and committed with "hg commit".

At this point, {AppWorkingDirectory}\\working\\FilteredRepo will be a fully functioning Mercurial repository! If you want to stop there, great, or it's ready to push up to Kiln.

That's it. It's not pretty, but it works for us and hopefully it will work for you, or at least serve as a starting point. Enjoy!
