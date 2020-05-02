---
layout: post
date: 2013-02-07
title: Misbehaving Web.config transforms
permalink: misbehaving-web-config-transforms
excerpt: <p>Visual Studio 2010 added the ability to add transform files to web.config
  files so that you could have one combination of settings during development, and
  then another set when deploying to different environments with the Publish Website
  tool.</p>  <p>This is immensely powerful, allowing obvious things such as turning
  off debug mode for production builds, and changing database connection strings,
  but also more subtle ones like ensuring that QA people banging against new code
  don't unknowingly send a bunch of test emails to people who will not be interested
  in non-production data.</p>  <p>This means that there is really <strong>ZERO</strong>
  excuse for saying something like "So how you deploy this app is you build it locally
  and then you copy over everything except the Web.config file." <em>No, that is not
  OK</em>. That will<em>&#160;</em><em>definitely</em> result in a bad
  build at some point in the future. But unfortunately, I worked on a project where
  I heard exactly that sentence.</p>
categories:
- Development
tags:
- XML
- Web.config
- transformations
comments: true
---
Visual Studio 2010 added the ability to add transform files to web.config files so that you could have one combination of settings during development, and then another set when deploying to different environments with the Publish Website tool.

This is immensely powerful, allowing obvious things such as turning off debug mode for production builds, and changing database connection strings, but also more subtle ones like ensuring that QA people banging against new code don't unknowingly send a bunch of test emails to people who will not be interested in non-production data.

This means that there is really **ZERO** excuse for saying something like "So how you deploy this app is you build it locally and then you copy over everything except the Web.config file." *No, that is not OK*. That will* **definitely* result in a bad build at some point in the future. But unfortunately, I worked on a project where I heard exactly that sentence.

I started adding web.config transforms, but they weren’t working. I finally figured out that the issue was a namespace in the base web.config:

```
<!-- Web.config -->
<?xml version="1.0"?>
<configuration xmlns="http://schemas.microsoft.com/.NetConfiguration/v2.0">
    ...
</configuration>

<!-- Web.Release.config -->
<?xml version="1.0"?>
<configuration xmlns:xdt="http://schemas.microsoft.com/XML-Document-Transform">
    ...
</configuration>
```

Notice how the Web.Release.config pulls in the namespace **xdt** to define the possible transformation commands, as it should, but the document itself does not have a namespace, that is, there is no xmlns=”SOME\_URL” in the document element.

Contrast this with the root Web.config, which has the base namespace of "http://schemas.microsoft.com/.NetConfiguration/v2.0" which doesn’t even return when I try to access it.

I don’t know why this namespace existed – this is a VERY old project that was started before .NET 2.0 had been released, but suffice it to say that it is NOT required. I even found a [forum posting](http://forums.asp.net/t/981068.aspx/1) by [Scott Guthrie](http://weblogs.asp.net/scottgu/) indicating that a bug in a previous version of Visual Studio caused this to be added and it is not needed.

What it does do is blow up the transform. So get rid of it!

If this isn’t YOUR web.config translation issue, there are tools that can help. In particular, the [Web.config Transformation Tester](http://webconfigtransformationtester.apphb.com/) tool allows you to test these transformations right in a browser. It only shows you the result of a transform (it won’t tell you why a failing one fails) but it can be a valuable diagnostic and testing tool.

Also of note, if you want to apply config transforms to app.config files, or do so on F5 or on build instead of on publish, check out [Scott Hanselman’s post](http://www.hanselman.com/blog/SlowCheetahWebconfigTransformationSyntaxNowGeneralizedForAnyXMLConfigurationFile.aspx) on [Slow Cheetah XML Transforms](http://visualstudiogallery.msdn.microsoft.com/69023d00-a4f9-4a34-a6cd-7e854ba318b5).
