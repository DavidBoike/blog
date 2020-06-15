---
layout: post
date: 2020-06-16
title: Path.Combine() isn't as cross-platform as you think it is
permalink: path-combine-isnt-as-cross-platform-as-you-think-it-is
cover: /images/2020/banana-slip.jpg
comments: true
categories:
- Development
tags:
- C#
---

I started using .NET pretty close to the beginning, in either 2002 or 2003. It's hard to accurately remember things that happened before I had kids.

Ever since that time, using `Path.Combine()` has been a best practice. You shouldn't just concatenate paths together with `\\` after all, one day it's possible that .NET could be cross-platform and then all that Windows-specific code will be broken! With each passing year, I grew less and less convinced that cross-platform .NET would ever happen but dutifully continued using `Path.Combine()` anyway.

Well now with .NET Core, cross-platform .NET is a reality, but as it turns out, `Path.Combine()` isn't quite the cross-platform panacea I feel I was promised.

In this article, I'll tell you what to look out for when using `Path.Combine()` on multiple platforms so you won't get burned the same way I was.

<!-- more -->

## Background

The point of `Path.Combine()` is pretty simple on the surface.

Let's say you have a base path `C:\base\path` and you want to add the filename `myfile.txt` to it.

```
var basePath = @"C:\base\path";
var filename = "myfile.txt";
```

You could just concatenate the strings:

```
var fullPath = basePath + "\\" + filename;
```

Or now that we have string interpolation you could concatenate it this way:

```
var fullPath = $"{basePath}\\{filename}";
```

But that's bad when we enter the realm of cross-platform because if I were executing this on macOS or Linux, or anything UNIX-like, my path separator would be different:

```
var basePath = "/Users/david";
var filename = "myfile.txt";
```

And so, using either of the concatenation options above, my result would be `/Users/david\myfile.txt`. That _will not_ end the way you want it to.

That's where `Path.Combine()` comes in. Instead of string concatenation, you call this instead:

```
var fullPath = Path.Combine(basePath, filename);
// Windows Result: C:\base\path\myfile.txt
// Mac/Linux Result: /Users/david/myfile.txt
```

So all we have to do is use `Path.Combine()` and our apps will be 100% ready to run cross-platform. Hooray!

If only it were that simple.

## Problem 1: Multi-segment paths

Turns out, a lot of people use `Path.Combine()` _wrong_ and there's no feedback to tell you it's wrong.

At a basic level, `Path.Combine(a,b)` simply concatenates `a` and `b` with whatever the local path separator is, as determined by `Path.DirectorySeparatorChar`. You can kind of think of it like this:

```
public static string Combine(string path1, string path2)
{
    return path1 + Path.DirectorySeparatorChar + path2;
}
```

There is **absolutely zero** checking for whether those two parameters contain _existing_ directory separator characters for any platform. No sort of cross-platform normalization of directory separators going on there.

So what happens if you do this?

```
Path.Combine(basePath, @"a\b\c");
```

Keeping with our same `basePath` values for each platform above, for Windows you get `C:\base\path\a\b\c` which works great. But everywhere else, you get `/Users/david/a\b\c` which is not what you're angling for.

But lots of developers do this, because there's really no hint anywhere that a multi-segement path as one of those parameters is a bad idea. Let's take a look at the method signature, with the xmldoc that defines what you get in Intellisense:

```
/// <summary>Combines two strings into a path.</summary>
/// <param name="path1">The first path to combine.</param>
/// <param name="path2">The second path to combine.</param>
/// <returns>
/// The combined paths. If one of the specified paths is a zero-length string,
/// this method returns the other path. If path2 contains an absolute path,
/// this method returns path2.
/// </returns>
public static string Combine(string path1, string path2);
```

Now, the first parameter is usually an established path that's known to exist, so I have no qualms about `path1` here. But `path2` is extremely misleading. The definition of a _path_ is a potentially really long string containing multiple directory names. That's clearly not what is expected. Perhaps `path2` should be renamed to `pathSegment` or something else, but `path2` and the totally unhelpful parameter description "The second path to combine" are the exact opposite of what the method implementation expects.

The only real clue that something could be amiss (short of looking at the source code and understanding what it does…or reading this post) is that the `Combine` method has additional overloads that accept more parameters…

```
public static string Combine(string path1, string path2, string path3)
public static string Combine(string path1, string path2, string path3, string path4)
public static string Combine(params string[] paths)
```

…but really, these all continue the sins of the first.

So instead of this…

```
Path.Combine(basePath, @"a\b\c");
```

…we should really be using this instead:

```
Path.Combine(basePath, "a", "b", "c");
```

But unfortunately, it's pretty common to see a lot more of the former than the latter.

## Windows is too forgiving

I've seen `Path.Combine(…)` used as sort of a low-rent version of `Server.MapPath(string path)` method, a staple of my (thankfully long-over) ASP.NET Web Forms days.

For those not familiar, `Server.MapPath(string path)` is [part of the System.Web assembly](https://docs.microsoft.com/en-us/dotnet/api/system.web.httpserverutility.mappath) and its purpose is to return a physical path that corresponds to a specific virtual path. So if you start out with a path from a web request, like `/path/to/file.html`, then `Server.MapPath(…)` understands what the root folder of the website is, as well as (if I recall correctly) any virtual directories set up in IIS as well. So then if your webroot is `C:\inetpub\wwwroot` and your virtual path is `/path/to/my-file.txt`, then `Server.MapPath("/path/to/my-file.txt")` will return that the file physically lives at `C:\inetpub\wwwroot\path\to\my-file.txt`.

All well and good, but living in `HttpServerUtility` in the monolithic `System.Web` assembly meant tight coupling to IIS. If you were building something with a different web framework, you didn't have that.

So now, if you Google [aspnetcore MapPath](https://lmgtfy.com/?q=aspnetcore+MapPath), what do you get? My [first search result](https://www.mikesdotnetting.com/article/302/server-mappath-equivalent-in-asp-net-core) says what?

It says use `Path.Combine(webRoot, "test.txt")`.

OK, that works. What if your controller action is a catch-all like this?

```
string webRoot;

[HttpGet("{*filePath}")]
public async Task<ActionResult> Get(string filePath)
{
    var physicalPath = Path.Combine(webRoot, filePath);
    // Do stuff
}
```

If you try accessing something a few directories deep, you'll end up with effectively this:

```
var physicalPath = Path.Combine(@"C:\root", "virtual/path-to/file.html");
```

And the result is: `C:\root\virtual/path/to/file.html`. That's right, you'll get **mixed** path separators.

But because Windows is too forgiving, `File.Exists()` on this path will return true, and you can happily return a `FileResponse` using that path. Maybe if it were a little more strict, people would get the memo that you aren't supposed to have existing delimiters in `Path.Combine()` parameters.

For the record, the next few search results right at this moment:

2. A [StackOverflow question](https://stackoverflow.com/questions/49398965/what-is-the-equivalent-of-server-mappath-in-asp-net-core) where the top-rated and accepted answer points out [IWebHostEnvironment](https://docs.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.hosting.iwebhostenvironment) to get the root directory but not how to safely combine paths. That answer links to a different answer on the same page which…uses `Path.Combine()`.
3. [Another StackOverflow question](https://stackoverflow.com/questions/43992261/how-to-get-absolute-path-in-asp-net-core-alternative-way-for-server-mappath/43992313), same focus on how to get the web root and same use of `Path.Combine()`.
4. [Blog post](https://gunnarpeipman.com/aspnet-core-content-webroot-server-mappath/) that ignores the "combine" part entirely.
5. A DZone scrape of the article in #4.
6. [Another blog post](https://inthetechpit.com/2020/02/17/how-to-use-server-mappath-in-asp-net-core/) that ignores combining.
7. [Anotehr blog post](https://kontext.tech/column/aspnet-core/228/servermappath-equivalent-in-aspnet-core-2) that uses `Path.Combine()`.
8. An [aspnetcore GitHub issue titled "Server.MapPath in AspNetCore"](https://github.com/dotnet/aspnetcore/issues/3824) that ends with "We don't have plans to implement this."

You get the idea? How many developers would search farther than this? Maybe I'll get lucky and this post will crack the top 5 and help somebody out. Maybe that person is you!

## Root paths

Consider these two examples:

```
Console.WriteLine(Path.Combine(Environment.CurrentDirectory, "\\abc\\abc"));
Console.WriteLine(Path.Combine(Environment.CurrentDirectory, "/abc/abc"));
```

The `Path.Combine(…)` method has some kinda-sorta nods to trying to maybe a _little bit_ be cross-platform, but it doesn't work out too well in practice. In an internal `IsPathRooted()` method, a check is made to see if the first character of the second parameter is a directory separator or volume separator character.

On Windows, `\\` is considered the primary directory separator, while `/` is considered an _alternate_ directory separator. So the result is this:

```
// Windows
\abc\abc
/abc/abc
```

The beginning character was taken to represent the "root" of a filesystem, and so the first parameter wasn't used at all. The answer in both cases was whatever the second path was.

Now here's the result on my Mac:

```
/Users/david/testapp/bin/Debug/netcoreapp3.1/\abc\abc
/abc/abc
```

Well, that's interesting. On macOS (and I assume on Linux as well, though I did not check) the primary directory separator AND the alternate directory separator are both `/` and the character `\\` is never considered, _ever_.

This is a bit of a corner-case, but still, drastically different results from code executing on different platforms. All the more reasons that `Path.Combine()` parameters should not be allowed to contain directory separators of any kind.

Perhaps one day I'll get around to writing a Roslyn analyzer to make that a compile-time error.

## Summary

For a method that was created more than a decade before the framework was made cross-platform, it's kind of amazing that `Path.Combine(…)` works at all. It does was it does, but you need to be aware of its idiosyncracies if you plan to use it in a cross-platform application or library.

There are really three basic, interrelated rules of thumb to keep in mind:

1. The first parameter of `Path.Combine(…)` should be thought of as a base path, and you should always be absolutely sure that path already exists on the system.
2. **Every other parameter** (because there are multiple overloads for different numbers of parameters) should not contain **any** path separator characters, from **any** platform.
3. When using `Path.Combine(…)` with user input, arbitrary inputs from a web request, or basically anything that isn't a _literal_ string, you should take care to split it apart based on all the different platform-specific directory separator characters (in practice, `/` and `\\`) and then feed the results of that into `Path.Combine(params string[] paths)`.

One example of how to do #3 is this method:

```
using System.IO;
using System.Linq;

public static class CrossPlatform
{
    public static string PathCombine(string basePath, params string[] additional)
    {
        var splits = additional.Select(s => s.Split(pathSplitCharacters)).ToArray();
        var totalLength = splits.Sum(arr => arr.Length);
        var segments = new string[totalLength + 1];
        segments[0] = basePath;
        var i = 0;
        foreach(var split in splits)
        {
            foreach(var value in split)
            {
                i++;
                segments[i] = value;
            }
        }
        return Path.Combine(segments);
    }

    static char[] pathSplitCharacters = new char[] { '/', '\\' };
}
```

Unfortunately, all the string splitting and then recombining allocates a lot more memory and will be quite a bit slower than `Path.Combine(…)` on a hot path, but more performant code will be inherently less readable and may need to re-implement some of the base assumptions that you take for granted in `Path.Combine()`.