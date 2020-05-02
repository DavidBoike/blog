---
layout: post
date: 2010-02-22
title: WCF Peer Node
permalink: wcf-peer-node
categories:
- Development
tags:
- WCF
- P2P
- NetPeerTcpBinding
comments: true
---
## One Framework to rule them all...

 I have a love-hate relationship with Windows Communication Foundation (WCF). I've been doing a lot of work with it lately and depending on the day, I think the acronym might stand for **W**ay **C**ool **F**eature or **W**hy is **C**onfiguration so **F**rustrating.

One of the most difficult aspects is that there are too many moving parts. Every solution to a problem requires six or seven different parts, each of which can have a core component and a configuration component and probably another couple components, all of which can inter-operate in a few dozen different ways.

Perhaps this is the ultimate drawback of a system that can do so many things that it's it's really hard to come up with an [elevator pitch](http://en.wikipedia.org/wiki/Elevator_pitch) that describes it succinctly.

So whenever I finally figure something out, if possible it's nice to wrap all that confusement (ridiculous non-word used on purpose) up in something more sane and digestible.

So that was my goal in making a WcfPeerNode to encapsulate the power of the NetPeerTcpBinding to create a peer network of interconnected applications around a WCF service contract.

My goal was to interconnect different ASP.NET applications in a server farm, so that when a user performed an action against one server, resulting in a cache item being dropped and reloaded, all servers in the farm could drop the cache item in a coordinated fashion. This would enable longer cache times on seldom-changed data without sacrificing update speed, without going for a full-blown distributed cache like [Memcached](http://sourceforge.net/projects/memcacheddotnet/) or Microsoft project code named [Velocity](http://blogs.msdn.com/velocity/). Sometimes I don't want to deal with a distributed cache and its requirement that everything be serializable, I just want to be able to drop cache entries in all locations simultaneously!

Sadly, it looks like NetPeerTcpBinding doesn't work in ASP.NET. Although the following code works just fine in a console application, when run in an ASP.NET website it generates the following error:

> System event notifications are not supported under the current context. Server processes, for example, may not support global system event notifications.

 Um, gee, thanks.

 <!-- more -->

## WcfPeerNode Class

 As dismayed as I was to be robbed of my new ASP.NET toy, the code would still work for a Console or Windows Forms application, so here it is.

### Members and Constructor

    // TContract is the type of the ServiceContract
    // We want the class to implement IDisposable so we can use it in a using block if needed.
    public class WcfPeerNode : IDisposable where TContract : class
    {
        public Uri P2pUri { get; private set; }
        private EndpointAddress endptAddress;
        private DuplexChannelFactory factory;
        private NetPeerTcpBinding binding;
        private InstanceContext context;
        private TContract proxy;
        private bool isDisposed = false;
        public WcfPeerNode(string p2pUriString, TContract svcImplementation)
            : this(new Uri(p2pUriString), svcImplementation)
        {
            // Just a convenience constructor for a string-based URI
        }
        public WcfPeerNode(Uri p2pUri, TContract svcImplementation)
        {
            // Create an endpoint given the peer-to-peer URI
            this.P2pUri = p2pUri;
            this.endptAddress = new EndpointAddress(this.P2pUri);
            // Create the binding
            this.binding = new NetPeerTcpBinding();
            this.binding.Port = 0;
            this.binding.Security.Mode = SecurityMode.None;
            this.binding.Resolver.Mode = PeerResolverMode.Pnrp;
            // Create a service context using the service object that implements the service contract
            this.context = new InstanceContext(svcImplementation);
            // Create the channel factory.  Duplex channel seems to be required for P2P.
            this.factory = new DuplexChannelFactory(this.context, this.binding, this.endptAddress);
        }
    }

After instantiating the object we've gotten everything set up but haven't actually made any connections. It's best to lazy-load that when required.

### Proxy Property

 Here's the property that lazily initializes the connection to the peer mesh.

    public TContract Proxy
    {
        get
        {
            if (isDisposed)
                throw new ObjectDisposedException("Proxy");
            if (proxy == null)
            {
                lock (this) // Be careful for multithreading, we wouldn't want a race condition here.
                {
                    if (proxy == null)
                        proxy = this.factory.CreateChannel();
                }
            }
            return proxy;
        }
    }

### IDisposable Implementation

 And of course we need the implementation of IDisposable, disposing of anything that may or may not be important, including testing our implementation object to see if it wouldn't mind being disposed, and obliging it if it does.

    public void Dispose()
    {
        this.isDisposed = true;
        if (this.factory != null)
        {
            this.factory.Close();
            this.factory = null;
        }
        if (context != null)
        {
            context.Close();
            context = null;
        }
        if (proxy != null)
        {
            if(proxy is IDisposable)
                (proxy as IDisposable).Dispose();
            proxy = null;
        }
    }

## Client Code

 With our WcfPeerNode generic class hiding all the gory details, we can now create a peer relationship in 4 easy steps:

1.  Create the Service Contract
2.  Create the Service Implementation
3.  Instantiate the peer node.
4.  Communicate with the Proxy object.

### Service Contract

 It seems to be a requirement of the NetPeerTcpBinding that the service contract have a callback contract. It works to use the same contract as the callback contract. I didn't test with a separate contract because I didn't see a need. In a peer network it would seem logical that all peers would communicate with each other with one set of commands understood by all; having more than one command set would seem overly confusing.

It is also a requirement that all the OperationContract attributes include the IsOneWay = true property so that the nodes can send and forget.

    [ServiceContract(CallbackContract = typeof(IPeerTest))]
    public interface IPeerTest
    {
        [OperationContract(IsOneWay = true)]
        void SendMessage(int from);
    }

### Service Implementation

    public class PeerImplementation : IPeerTest
    {
        // Just generate a random number so we can easily see the peer communication at work
        public static readonly int Me = new Random().Next(0, 1000);
        public void SendMessage(int from)
        {
            Console.WriteLine("Message from {0} to {1}", from, Me);
        }
    }

### Main Application Code

    static void Main(string[] args)
    {
        // Peer-to-Peer urls always start with the scheme net.p2p
        string url = "net.p2p://test.peer-to-peer.com/JustTesting";
        // Our implementation object that prints out the results
        PeerImplementation impl = new PeerImplementation();
        using (WcfPeerNode node = new WcfPeerNode(url, impl))
        {
            while (!Console.KeyAvailable) // Keep the app running until we hit something
            {
                // Send a message to the peer group from our random ID number and sleep 5s
                node.Proxy.SendMessage(PeerImplementation.Me);
                Thread.Sleep(5000);
            }
        }
    }

### Output

 When the program first starts, you get something like this, with a new line appearing every 5 seconds:

    Message from 114 to 114
    Message from 114 to 114
    Message from 114 to 114
    Message from 114 to 114

But when you start up another copy of the program, you see the following:

    # Console 1
    Message from 114 to 114
    Message from 114 to 114
    Message from 114 to 114
    Message from 114 to 114
    Message from 397 to 114    ---- Second program starts
    Message from 114 to 114
    Message from 397 to 114
    Message from 114 to 114
    Message from 397 to 114
    #Console 2
    Message from 397 to 397
    Message from 114 to 397
    Message from 397 to 397
    Message from 114 to 397
    Message from 397 to 397

Each application receives messages sent from itself and its peers.

## Closing Thoughts

 First, as written this is dependent upon Peer Name Resolution Protocol (PNRP). This is installed on Vista and Windows 7 by default, on Windows Server 2008 as an optional component. It's available as as a [download for Windows XP SP2](http://www.microsoft.com/downloads/details.aspx?FamilyId=55219164-EC71-4A32-A648-4ED2582EBC7C&displaylang=en), and I don't know if that would work for Windows Server 2003. PNRP requires IPv6, which the routers in my server farm aren't set up to handle, so I created my own class inheriting from [System.Net.PeerToPeer.PeerNameResolver](http://msdn.microsoft.com/en-us/library/system.net.peertopeer.peernameresolver.aspx)that stored peer resolution information in a database, which never got past proof-of-concept. To use a custom resolver, edit the WcfPeerNode constructor as follows:

    //this.binding.Resolver.Mode = PeerResolverMode.Pnrp;   --- remove this line
    this.binding.Resolver.Mode = PeerResolverMode.Custom;
    this.binding.Resolver.Custom.Resolver = new YourCustomResolver();

Writing a custom PeerResolver is a fun project all by itself, mostly due to the complete lack of sufficient documentation

Other things that could improve this class, but I just didn't get to:

-   Input validation in the constructor:
    -   Ensure the URI uses "net.p2p" as the scheme.
    -   Ensure typeof(T) is an interface decorated with a ServiceContract attribute that has CallbackContract specified
    -   Use reflection to ensure that the contract's operations have IsOneWay set to true

-   A WCF proxy object can be cast to an ICommunicationObject which can be used to get information about the connection including state (open, faulted, etc.) - it would be good to have a property exposing this functionality.
-   Any additional knobs on non-required features such as the specification of a custom resolver.

 In the long run this was a useful project because it increased my understanding of WCF. It would just be nice to get to use it how I want. :(
