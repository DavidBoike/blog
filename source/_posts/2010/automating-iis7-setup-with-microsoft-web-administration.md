---
layout: post
date: 2010-12-19
title: Automating IIS7 Setup with Microsoft.Web.Administration
permalink: automating-iis7-setup-with-microsoft-web-administration
categories:
- Development
tags:
- IIS7
- kiln
- Mercurial
- continuous integration
- DVCS
- automation
comments: true
---
Switching from Subversion to Mercurial with [Kiln](http://www.fogcreek.com/kiln/) was one of the best things we ever did, but it wasn't without its pain points. The biggest problem is when you have websites that can't be hosted by the integrated Visual Studio web server (Cassini) and require complex IIS configurations that can't be version-controlled.

With a [distributed version control system (DVCS)](http://en.wikipedia.org/wiki/Distributed_Version_Control_System) such as Mercurial, you're supposed to clone branch repositories all over the place, but redoing the IIS configuration can be a major drag.

Luckily, IIS7 comes with Microsoft.Web.Administration.dll, a managed assembly that allows you to automate server administration tasks, something that was next to impossible in IIS6.

<!-- more -->

## The Plan

 Now, to be complete, I should mention that there are other methods of automating IIS7, such as [Windows PowerShell](http://learn.iis.net/page.aspx/428/getting-started-with-the-iis-70-powershell-snap-in/). However, I'm a C\# developer, so the managed assembly lends itself toward my strengths.

The idea is to create a console application in the Visual Studio solution with the website, and automate the creation of the local development website with it. No manual configuration allowed! Every step you take toward complete automation will pay off in the future when you need to branch your code or set up a new build server.

The console app should take command line arguments to indicate what environment the website will be living in (development, test, integration, QA, production, etc.) and then branch appropriately to set up different options required for each of those environments, and then provide batch files to execute each of those options.

Then, a fellow developer can run the appropriate batch file to get their development environment set up, and a continuous build server can do the same for a test environment.

## Getting Started

 First you will need a reference to the IIS7 Administration assembly, Microsoft.Web.Administration.dll, which can be found at %systemroot%\\system32\\inetsrv.

Everything is managed through the [ServerManager class](http://msdn.microsoft.com/en-us/library/microsoft.web.administration.servermanager%28v=vs.90%29.aspx). I find it easiest to skip the creation of the application pool, and do that manually. The application pool contains the identity information the web application will run under, and you probably don't want that in a source control repository anyway.

So, all you really need is the application pool's name, but you should probably verify it before going any further.

    ServerManager mgr = new ServerManager();
    if (mgr.ApplicationPools[appPool] == null)
        throw new ApplicationException("App Pool '" + appPool + "' does not exist.");

Here's how you create a new site:

    string siteName = "WebsiteName";
    string bindingProtocol = "http";
    string bindingInformation=":80:dev.newsite.com";
    string physicalPath = "C:\path\to\site\root";
    Site site = mgr.Sites.Add(siteName, bindingProtocol, bindingInformation, physicalPath);

Note that there are other overloads of Add() available. Binding Information must be in the format "IP:PORT:DOMAIN" where \* can be substituted for IP or DOMAIN, for example "\*:80:dev.sitename.com" to respond to requests for dev.sitename.com on port 80 on any IP address bound to the machine. More bindings can be added through the [Bindings](http://msdn.microsoft.com/en-us/library/microsoft.web.administration.site.bindings(v=VS.90).aspx) collection of [Site](http://msdn.microsoft.com/en-us/library/microsoft.web.administration.site%28VS.90%29.aspx).

Virtual directories and sub-applications can be added through the root application.

    Application rootApp = site.Applications["/"];
    VirtualDirectory vDir = rootApp.VirtualDirectories.Add("/virtualPath", @"C:\physical\path");
    Application subApp = site.Applications.Add("/subapp", Path.Combine(@"C:\subapp\physical\path"));

No configuration is actually changed until you say so. This is nice because if you happen to cause an exception, no harm no foul. To save and commit your changes to IIS, call the ServerManager's CommitChanges() method.

    mgr.CommitChanges();

## More Complex Configuration

 Things get a little dicier for more complex configurations, like HTTP Redirect, default documents, and all the other goodies that the IIS7 Manager gives you access to. There is no built-in object model for these types of settings - you have to tap into the configuration system.

In these cases it's usually easiest to set up a dummy site with the GUI tools, and then inspect the applicationHost.config file to see what happened as a result.

The applicationhost.config file lives at %systemroot%\\system32\\inetsrv\\config. It gets a little weird about trying to edit it in place, and it's a pretty important file, so it's easier to copy it to your desktop and inspect it from there.

Open the file and look for your example website by name and look at the settings under it. You also may need to look for elements near the bottom of the file for additional settings.

Once you have figured out what setting you want to try to implement, take a look at the top of the file, in the configSections area. You must address everything to a section path, and it can be hard when looking at the settings to tell what is a section and what is a sectionGroup.

For example, to modify the Anonymous Authentication settings, you need to concatenate all the section group names leading up to the anonymousAuthentication section:

system.webServer/security/authentication/anonymousAuthentication

You also need to know the location you are addressing. This can either be the name of the web application to work with the scope of the entire application, or the web application followed by the location path to specify a particular virtual directory.

Once a section is obtained, any of the properties can be set with the [SetAttributeValue()](http://msdn.microsoft.com/en-us/library/microsoft.web.administration.configurationelement.setattributevalue%28v=VS.90%29.aspx) method.

Here is an example, where anonymous authentication is enabled for the web application, but disabled for a subdirectory:

    Configuration config = mgr.GetApplicationHostConfiguration();
    string anonAuthPath = "system.webServer/security/authentication/anonymousAuthentication";
    ConfigurationSection globalAnonAuth = config.GetSection(anonAuthPath, "MyWebApp");
    globalAnonAuth.SetAttributeValue("enabled", true);
    ConfigurationSection subdirAnonAuth = config.GetSection(anonAuthPath, "MyWebApp/Secured");
    subdirAnonAuth.SetAttributeValue("enabled", false);

Using this basic structure, you can configure any property that IIS knows about.

## Summary

 Using Microsoft.Web.Administration, it is possible to automate the configuration of IIS7 websites. This is a crucial advantage when setting up new development environments, or deploying IIS configuration along with the code in a continuous integration environment.
