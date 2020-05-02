---
layout: post
date: 2013-02-08
title: All About NServiceBus Host Profiles and Roles
permalink: all-about-nservicebus-host-profiles-and-roles
categories:
- Development
tags:
- NServiceBus
- profiles
- roles
- reference
comments: true
---
The NServiceBus Host process is a pretty amazing piece of software that hosts your message handlers, can be run from the command line or installed as a Windows service, and is supremely extensible. This is a great strength for NServiceBus but it can also be a little overwhelming for the developer just starting to wade into the great pool of service bus logistics.

Much of how an endpoint will configure itself is based on Profiles and Roles:

-   **Profile** – controls the environment and features the endpoint is supposed to run with. These are set at the command line by passing the class name (or names) of the desired profile (or profiles) like “NServiceBus.Host.exe NServiceBus.Integration”. Because this is set at run-time, this allows the same collection of code to run in different configurations depending on environment.
-   **Role** – controls what services the endpoint will need based on how it will interact with other services. There are 3 defined roles: AsA\_Client, AsA\_Server, and AsA\_Publisher, and these are set in code, so these are static for an endpoint.

 In this blog post I will try to spell out everything that these profiles and roles do, based on my experience and source code snooping with [Reflector](http://www.red-gate.com/products/dotnet-development/reflector/). Use this as a quick reference so you don’t have to go hunting through reflected source yourself.

 <!-- more -->

Note that all of this information is based on NServiceBus 3.3.4. I’m positive that things will change as new versions are released.

## Environment Profiles

 There are 3 environment profiles which help you manage changes through the development lifecycle.

### NServiceBus.Lite

 The Lite profile should be used during development, because it makes everything easy to set up and tear down quickly. Logging happens to the console so you can see it, and all storage is handled in memory so there is nothing to have to set up.

When an endpoint runs under the Lite profile, it will:

-   Register the in-memory timeout manager.
-   Register as a master node with in-memory gateway persistence.
-   Register the in-memory saga persister, if a saga persister isn't already registered.
-   Register the in-memory fault manager, if one isn't already registered.
-   If the endpoint implements AsA\_Publisher and subscription storage isn't already registered, register in-memory subscription storage.
-   Set the installation runtime to run installers but not install infrastructure.
-   Set up logging to the console with a default threshold of INFO.

### NServiceBus.Integration

 The Integration profile is a good candidate for Test/QA/Integration environments. By default it moves to durable persistence mechanisms (RavenDB by default) so that you can install new code without losing the current system state.

When an endpoint runs under the Integration profile, it will:

-   Configure RavenDB for persistence.
-   Configure the default error handling mechanism if no other Fault Manager is registered.
-   Configure RavenDB for saga persistence if a saga persister isn't already registered.
-   If the endpoint implements AsA\_Publisher and no subscription storage is already registered, then:
    -   If the Master, Worker, or Distributor profile is also activated, then RavenDB subscription storage is registered.
    -   Otherwise, MSMQ subscription storage is registered.

-   Set the installation runtime to run installers but not install infrastructure
-   Set up logging to the console with a default threshold of INFO.

### NServiceBus.Production

 The Production profile is for installing to (wait for it) production environments. All storage is durable (RavenDB by default) and performance counters are also enabled.

As NServiceBus aims to be "production ready by default", if you do not specify a profile on the command line, the Production profile will be assumed.

When an endpoint runs under the Production profile, it will:

-   Configure RavenDB for persistence.
-   Configure RavenDB for saga persistence if a saga persister isn't already registered.
-   Configure the default error handling mechanism if no other Fault Manager is registered.
-   If the endpoint implements AsA\_Publisher and no subscription storage is registered, register RavenDB for subscription storage.
-   Because the Production profile class inherits from PerformanceCounters, performance counters will (by association) be enabled.
-   Set up logging to files via the RollingFileAppender.
-   If the console exists (not running as a background service) then also set up console logging.

## Feature Profiles

 Feature profiles are different form environment profiles in that their scope is a lot more limited. This enables you to take the same set of code and deploy it in multiple locations differently. For example, you create one service, but then to scale it out you deploy one instance as a Master Node, and other instances as Worker nodes that feed off that master.

Here are the things that the different feature profiles will do when activated:

### NServiceBus.Distributor

-   If the Worker profile is also activated, throws an exception. The Distributor and Worker profile cannot coexist.
-   Configures the endpoint as a master node that runs the distributor with no worker on its own endpoint.

### NServiceBus.Master

-   If the Worker profile is also activated, throws an exception. The Master and Worker profile cannot coexist.
-   Configures the endpoint as a master node.
-   Runs the distributor.
-   Runs the gateway.
-   Runs the timeout manager.

### NServiceBus.MultiSite

-   Runs the Gateway component.

### NServiceBus.PerformanceCounters

-   Enables performance counters.

### NServiceBus.Time

-   Logs a warning that the Timeout profile is obsolete, as Timeout Manager is on by default for Server and Publisher roles.
-   Yes really, all it does is log a warning.

### NServiceBus.Worker

-   Throws an exception if either Master or Distributor profiles are also enabled, as Worker cannot coexist with these.
-   Validates the master node configuration and enlists with the distributor on that master node.

## Roles

 Roles define what type of endpoint this is. Is it send-only client? Does it handle messages? Does it process Sagas? Does it publish events? These are the questions answered by a Role.

To use a Role, you implement the marker interface on the IConfigureThisEndpoint like so:

Here is a rundown of what happens by default for each Role.

### AsA\_Client

-   Configures the MSMQ transport.
-   Defaults transport settings to:
    -   PurgeOnStartup = true
    -   IsTransactional = false
    -   ImpersonateSender = false

### AsA\_Server

-   Configures the MSMQ transport
-   Configures for handling Sagas
-   Configures the TimeoutManager
-   Defaults transport settings to:
    -   PurgeOnStartup = false
    -   IsTransactional = true
    -   Impersonate Sender = true

### AsA\_Publisher

-   Inherits from AsA\_Server, so does everything that does
-   As seen in the Environment Profiles section above, this is used as a marker to show that subscription storage needs to be configured.

## Modifying or Adding Behavior

 All of the above is only what happens by default. It is fairly simple to add to or override these behaviors by creating new profiles or adding behavior to existing ones.

#### To create a new profile

-   Create a class that implements NServiceBus.IProfile.
-   There is no implementation, it’s just a marker interface.
-   To invoke, add the full class name (YourNamespace.YourProfileName) to the command line when launching the endpoint or installing as a service.

#### To invoke functionality on a profile, either a built-in profile or your own

-   Create a class that implements NServiceBus.Hosting.Profiles.IHandleProfile, where T : IProfile
-   Implement the ProfileActivated() method.
-   Access the NServiceBus config object using NServiceBus.Configure.Instance.
-   If you want access to the IConfigureThisEndpoint class, add a public property to be injected

#### To configure logging for a profile

-   This really only makes sense with the environment profiles
-   Create a class that implements NServiceBus.IConfigureLoggingForProfile where T : IProfile
-   Implement the Configure(IConfigureThisEndpoint specifier) method.
-   Configuration of logging is separate from everything else in IHandleProfile because logging must be set up *much* earlier in the endpoint’s life cycle.

 It’s possible to do the same with Roles, however I can’t seem to think of a good use case for this, so I won’t bother explaining the technical details except to say it’s very similar to profiles, except with IRole and IConfgiureRole instead of IProfile and IHandleProfile. Feel free to disagree with me – if you can give me a use case I can get behind, I’ll add to this post. Until then, enjoy!
