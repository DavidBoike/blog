---
layout: post
date: 2010-12-05
title: Apple Push Notification certificates without the Mac Keychain
permalink: apple-push-notification-certificates-without-the-mac-keychain
categories:
- Development
tags:
- Apple
- push notifications
- APNS
- Bouncy Castle
- certificates
- cryptography
comments: true
---
If you want to send push notifications to an iPhone application from a .NET platform, the Mac Keychain turns out to be a *major* buzzkill.  In order to get a .p12 file suitable for use with the [apns-sharp push notifications library](http://code.google.com/p/apns-sharp/) in the Keychain, you have to perform a complex, manual (read error-prone) procedure that gets really annoying, especially if you have many apps to provision for push notifications, as I do.

Wouldn't it be great if you could do this in C\#, on Windows, without a Mac or the Keychain?  Well, you can!

<!-- more -->

## How the Keychain Works

In order to replicate the Keychain process in C\# .NET, it's important to understand how the process works.

The Keychain's job is to manage certificates and keys for you by providing a wizard-like GUI over (likely) the OpenSSL API.  The complexity really isn't Apple's fault – they actually do a pretty good job of making a complex process easy to use; it's just impossible to automate.  The process goes something like this:

-   We use the Keychain's Certificate Assistant to create a [Certificate Signing Request](http://en.wikipedia.org/wiki/Certificate_signing_request).  In order to do this, the Keychain creates a new public/private key pair.  The Keychain stores both the public and private key and keeps the private key safe and secure, although this is not immediately obvious at first blush.  The Certificate Signing Request (or CSR) contains the public key, and is signed by the private key, but does NOT contain the private key.
-   We upload the CSR file to Apple through the iOS Development Portal.  Apple validates the CSR (by checking the digital signature with the public key we gave them) and then issues us an [X.509 certificate file](http://en.wikipedia.org/wiki/X.509), which we can download.  This certificate is signed by Apple's private key, which we can verify because their public key is well known.  The file name is **always** aps\_production\_identity.cer for production push notifications, or aps\_developer.identity.cer for development push notifications in the sandbox.  If we are trying to provision several apps at the same time, the fact that every single certificate wants to be downloaded with the same filename is a management nightmare.
-   We import the certificate into the Keychain by dragging and dropping the file.  The Keychain recognizes that the associated private key is already stored in the Keychain, and it associates them together.  The Certificate Name is a very unhelpful string similar to "Apple Production Push Services XXXXXXXXXX:XXXXXXXXXX" where the Xs are random characters that relate to your developer and application identities.  They are **NOT**helpful for distinguishing a particular certificate from amongst a list of 50.  The only way to truly tell them apart is to expand them, which shows the name of the associated private key … that is, if you were smart enough to choose a unique, meaningful subject name when you completed the Certificate Signing Request wizard.  If not, you're better off creating a new CSR request and starting from scratch.
-   Some of the guides on the Internet say to export the certificate and the private key as a .p12 file, which is really confusing because if you select the certificate and private key entries and export both, the resulting file won't work.  Select **ONLY** the certificate, and export it, which will include the private key that you need.  You will need to specify a password to protect the private key, which you must type twice, and then you usually must type your Mac login password to confirm that you really want to export the private key out of the keychain.

With the .p12 file and associated password you selected in hand, you can finally use a library like apns-sharp to send the push notifications.  Unless you screwed up any of the above, which, if you're like me, you probably did at least once or twice.

## Certificate Management with Bouncy Castle

System.dll contains the [System.Security.Cryptography.X509Certificates](http://msdn.microsoft.com/en-us/library/system.security.cryptography.x509certificates.aspx) namespace, which includes classes for using X.509 certificates, but does not include enough functinality to do what we need to do.  So we must turn elsewhere.

Enter the [Bouncy Castle API](http://www.bouncycastle.org/csharp/), a freeware cryptography library that is a port of the Java Bouncy Castle API.  Unfortunately the Java API gets the most attention, and the C\# has near zero documentation.  However, browsing the Java documentation can be helpful – although class names don't always match exactly a Java example can sometimes put you on the right track.

Unfortunately, the exact source code I created is the intellectual property of my employer.  However, between this guide, .NET Reflector, and Intellisense, you should be able to get the job done.

### Creating the Certificate Signing Request

-   Use Org.BouncyCastle.Crypto.Generators.RsaKeyPairGenerator to generate a new public/private key pair.  The key strength must be 2048 bits.
-   You will need to be able to recreate the private key later, so cast the key pair's PrivateKey member to its most specific type (Org.BouncyCastle.Crypto.Parameters.RsaPrivateCrtKeyParameters) and save all of its properties so that they can be reused in the RsaPrivateCrtKeyParameters constructor.  The value obtained using the BigInteger.ToString() method is appropriate.  It is up to you if you want to store this in a database or XML file or whatever you can come up with, but there does not seem to be a convenient way I can find to save the entire thing in one fell swoop.
-   Org.BouncyCastle.Pkcs.Pkcs10CertificationRequest is the class that can generate the CSR.  The constructor will expect a signature algorithm.  Apple expects "SHA1withRSA".  The constructor will also expect an X509Name subject.  The subject string format is "emailAddress={0}, CN={1}, C=US".  The CN parameter is the value that, if generated through the Keychain, would become the private key name.
-   Get the CSR bytes with the GetDerEncoded() method, which you can convert to a Base64-encoded string.
-   Apple expects the CSR file in PEM (Privacy-enhanced Electronic Mail) format.  To accomplish this, write out 64 characters per line of the Base64-encoded bytes to a text file between the header and footer lines, so that it looks like this example from Wikipedia:

<!-- -->

    -----BEGIN CERTIFICATE REQUEST-----
    MIIBnTCCAQYCAQAwXTELMAkGA1UEBhMCU0cxETAPBgNVBAoTCE0yQ3J5cHRvMRIw
    EAYDVQQDEwlsb2NhbGhvc3QxJzAlBgkqhkiG9w0BCQEWGGFkbWluQHNlcnZlci5l
    eGFtcGxlLmRvbTCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkCgYEAr1nYY1Qrll1r
    uB/FqlCRrr5nvupdIN+3wF7q915tvEQoc74bnu6b8IbbGRMhzdzmvQ4SzFfVEAuM
    MuTHeybPq5th7YDrTNizKKxOBnqE2KYuX9X22A1Kh49soJJFg6kPb9MUgiZBiMlv
    tb7K3CHfgw5WagWnLl8Lb+ccvKZZl+8CAwEAAaAAMA0GCSqGSIb3DQEBBAUAA4GB
    AHpoRp5YS55CZpy+wdigQEwjL/wSluvo+WjtpvP0YoBMJu4VMKeZi405R7o8oEwi
    PdlrrliKNknFmHKIaCKTLRcU59ScA6ADEIWUzqmUzP5Cs6jrSRo3NKfg1bd09D1K
    9rsQkRc9Urv9mRBIsredGnYECNeRaK5R1yzpOowninXC
    -----END CERTIFICATE REQUEST-----

Unfortunately, you still have to upload this file to the iOS Developer Portal.  You can't escape Apple that easily!

### Converting the Apple Certificate to .p12

Now that you have the saved private key information and the Apple-supplied certificate, you can combine the two into a password-protected Personal Information Exchange (.p12) file.

-   .NET contains classes for dealing with X509Certificates, and it's easiest to construct the certificate from the .cer file using one of the constructors of .NET's built-in [X509Certificate2](http://msdn.microsoft.com/en-us/library/system.security.cryptography.x509certificates.x509certificate2.aspx) class and then convert it to Org.BouncyCastle.X509.X509Certificate using one of the utilitiy methods found in Org.BouncyCastle.Security.DotNetUtilities, then wrap that in an X509CertificateEntry.
-   Recreate the private key using the values saved when creating the CSR.
-   The class used to output the .p12 file is Org.BouncyCastle.Pkcs.Pkcs12Store.
-   You must add the certificate and the private key using the SetCertificateEntry() and SetKeyEntry() methods.  Use the same alias string for both – this is analogous to the Private Key Name used by the Keychain.  The SetKeyEntry requires an array of X509CertificateEntry objects for reasons I can't begin to explain – just pass in an array of length 1 containing the certificate.  Even though you add the certificate separately, this seems to be required by the API.
-   You can save the .p12 file to a file stream (or any other stream) using the Store() method of Pkcs12Store, specifying a password to protect the private key as you do so.

Congratulations!  Fire up apns-sharp and start sending push notifications!

## Couldn't you use OpenSSL to do this?

The answer is probably.  However, manageability and portability is very important to me.  Using OpenSSL I would need to do execute a bunch of external, non-managed processes, redirecting the inputs and outputs so that I could accomplish what I need.  Additionally, OpenSSL seems to worm its way too heavily into the operating system.  I don't like the idea of needing to install OpenSSL before running this process.  Bouncy Castle gives me a fully contained API I can run on top of .NET with no additional dependencies.
