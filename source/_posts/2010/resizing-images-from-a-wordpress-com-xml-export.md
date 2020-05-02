---
layout: post
date: 2010-07-21
title: Resizing Images from a Wordpress.com XML Export
permalink: resizing-images-from-a-wordpress-com-xml-export
categories:
- Development
tags:
- source code
- WordPress
- XML
- regular expressions
comments: true
---

**Note: Thanks to a suggestion from Asbjørn Ulsberg, I have made this source code available as a [GitHub repository](https://github.com/DavidBoike/WordPressExportConverter). As I wrote it, it's really a single-use tool - it even has my user path hard-coded. Please feel free to fork it and add whatever you like!**

My wife is an incredibly talented woman. While she's not working her day job at a magazine publisher, she makes and sells fondant-covered cakes, cupcakes, cookies, and other goodies. Let me tell you how difficult it is to try losing weight when there are constantly cake scraps lying around!

If you live in the Twin Cities area or are just plain curious, check out her website, [Sweets by Natalie Kay](http://www.sweetsbynataliekay.com). Some of my favorites: a [Chocolate Cherry Chip Transformer Cake](http://www.sweetsbynataliekay.com/2010/05/chocolate-cherry-chip-transformer-cake/), and this [Mario-Kart inspired birthday cake](http://www.sweetsbynataliekay.com/2009/06/erics-birthday/).

Her site is a WordPress blog that she started out its life hosted on [wordpress.com](http://wordpress.com), which is nice but doesn't give a lot of flexibility over themes and layout. When she wanted more flexibility, the task of converting the content to a different hosting provider fell to the family IT director.

WordPress contains export and import functionality, but a problem quickly emerged. WordPress.com adds width and height parameters to the querystring of images that are embedded within post text, which are intercepted by a handler that resizes the image to those dimensions before serving it to the client. However, the export file contains the URLs of the full size image.

My wife captured these images with her 10-megapixel D-SLR camera. These are not small files. The images (2-4 MB each) would load at a crawl, slowing down the entire page.

Programmer husband to the rescue! It's nice to be needed.

<!-- more -->

The first hurdle was getting the XML export file to load at all, as WordPress exports invalid XML, a fact that nearly made me gag!

**XmlException was unhandled**
 *'atom' is an undeclared namespace. Line 149, position 3.*

Seriously. Apparently WordPress exports by outputting text and not with any sort of complaint XML library, or blindly outputs some content elements without worrying about what XML namespaces that content might be using. Since I didn't intend to do this dozens of times, I decided this would be pretty easy to fix manually by adding the atom declaration to the rss element:

```
<rss version="2.0"
    xmlns:excerpt="http://wordpress.org/export/1.0/excerpt/"
    xmlns:content="http://purl.org/rss/1.0/modules/content/"
    xmlns:wfw="http://wellformedweb.org/CommentAPI/"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:wp="http://wordpress.org/export/1.0/"
    xmlns:atom="http://whocares.com/it-seriously-doesnt-matter"
>
```

The .NET XmlDocument will not care what the URL is or if it's "correct", it only cares that the atom namespace is declared.

After that, my conversion app does the following:

1.  Load the XML Document.
2.  Select each blog entry with an XPath expression.
3.  Use very simple regular expressions to identify the start of each image tag, and its corresponding closing bracket, outputting everything outside the image tag(s) as-is.
4.  Within each image tag, identify each HTML attribute, again by regular expression. If the width/height attributes are specified, save the values. If the src attribute contains a URL that includes w=? or h=? in the querystring, save those values
5.  With desired width and height values in hand, use the same attribute-finding regular expression to locate the src attribute and output a new URL that contains the width and height attributes that will tap into WordPress.com's image resizing feature.

 Using this modified export file, the WordPress import process downloads the downsized images from WordPress.com for the version embedded in the post text, but you can still click through to the full version of the image in all its megapixel glory.

So, here is the source:

    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Xml;
    using System.Text.RegularExpressions;
    namespace WordPressConverter
    {
        class Program
        {
            static void Main(string[] args)
            {
                string inpath = @"C:\Users\Dave\Desktop\wordpress.input.xml";
                string outpath = @"C:\Users\Dave\Desktop\wordpress.output.xml";
                ConvertWordpressExport(inpath, outpath);
            }
            private static void ConvertWordpressExport(string inpath, string outpath)
            {
                XmlDocument doc = new XmlDocument();
                doc.Load(inpath);
                XmlNamespaceManager nsmgr = new XmlNamespaceManager(doc.NameTable);
                nsmgr.AddNamespace("content", "http://purl.org/rss/1.0/modules/content/");
                XmlNodeList nodes = doc.SelectNodes("/rss/channel/item/content:encoded", nsmgr);
                foreach (XmlNode n in nodes)
                {
                    string newText = ProcessBlogPost(n.InnerText);
                    n.InnerText = null;
                    n.AppendChild(doc.CreateCDataSection(newText));
                }
                doc.Save(outpath);
                Console.WriteLine("Done");
                Console.ReadLine();
            }
            private static Regex findImgTag = new Regex("
            private static Regex findEndImg = new Regex("/>", RegexOptions.Compiled | RegexOptions.IgnoreCase);
            private static string ProcessBlogPost(string blogPost)
            {
                StringBuilder output = new StringBuilder();
                int pos = 0;
                while (true)
                {
                    Match startImg = findImgTag.Match(blogPost, pos);
                    if (!startImg.Success)
                    {
                        output.Append(blogPost.Substring(pos));
                        break;
                    }
                    else
                    {
                        output.Append(blogPost.Substring(pos, startImg.Index - pos));
                        Match endImg = findEndImg.Match(blogPost, startImg.Index);
                        pos = endImg.Index + endImg.Length;
                        string imgTag = blogPost.Substring(startImg.Index, pos - startImg.Index);
                        ImgTagProcessor p = new ImgTagProcessor(imgTag);
                        output.Append(p.Process());
                    }
                }
                return output.ToString();
            }
            class ImgTagProcessor
            {
                static Regex findAtts = new Regex(@"(?\w+)=""(?[^""]*)""", RegexOptions.Compiled | RegexOptions.IgnoreCase);
                static Regex queryW = new Regex(@"w=(\d+)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
                static Regex queryH = new Regex(@"h=(\d+)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
                string imgTag;
                string width;
                string height;
                internal ImgTagProcessor(string imgTag)
                {
                    this.imgTag = imgTag;
                }
                internal string Process()
                {
                    // Extract width and height info
                    foreach (Match m in findAtts.Matches(imgTag))
                    {
                        switch (m.Groups["Att"].Value)
                        {
                            case "width":
                                this.width = m.Groups["Value"].Value;
                                break;
                            case "height":
                                this.height = m.Groups["Value"].Value;
                                break;
                            case "src":
                                Uri uri = new Uri(m.Groups["Value"].Value);
                                string query = uri.Query;
                                if (!String.IsNullOrEmpty(query))
                                {
                                    Match matchW = queryW.Match(query);
                                    Match matchH = queryH.Match(query);
                                    if (matchW.Success)
                                        width = matchW.Groups[1].Value;
                                    if (matchH.Success)
                                        height = matchH.Groups[1].Value;
                                }
                                break;
                        }
                    }
                    return findAtts.Replace(imgTag, new MatchEvaluator(EvaluateAttributeMatch));
                }
                string EvaluateAttributeMatch(Match m)
                {
                    switch (m.Groups["Att"].Value)
                    {
                        case "src":
                            UriBuilder uri = new UriBuilder(m.Groups["Value"].Value);
                            List queryItems = new List();
                            if (width != null)
                                queryItems.Add("w=" + width);
                            if (height != null)
                                queryItems.Add("h=" + height);
                            uri.Query = String.Join("&", queryItems.ToArray());
                            return "src=\"" + uri.ToString() + "\"";
                        default:
                            return m.Value;
                    }
                }
            }
        }
    }

I hope someone else can find it useful!
