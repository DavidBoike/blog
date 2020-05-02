---
layout: post
date: 2010-09-13
title: Implementing an NServiceBus Saga Persister
permalink: implementing-an-nservicebus-saga-persister
categories:
- Development
tags:
- NServiceBus
- source code
- ISagaPersister
comments: true
---
By default, NServiceBus uses Fluent NHibernate to persist saga data to either a SQL or SQLite database. With its plugin architecture, it's relatively easy to swap out different parts with your own implementations, but it's not always completely obvious how to go about it. In this article I will attempt to illustrate an attempt to do just that. It may not be perfectly generalized code that could be included in the NServiceBus codebase, but I believe it gets the job done.

<!-- more -->

Many thanks to [Andreas Öhlund](http://andreasohlund.blogspot.com/) for all his help on the [NServiceBus Group](http://tech.groups.yahoo.com/group/nservicebus/) helping me through this.

## Motivation

When starting with the NHibernate saga persister, we had some problems, and it wasn't immediately obvious how to identify them. Mostly this was because I was had never used NHibernate at all, much less the conventions of Fluent NHibernate, so I didn't have any best practices to start designing my saga classes.

Here are some of the things I found:

-   If saga data must contain a collection, the item type must contain a "primary key" property of type Guid named Id. NHibernate requires this because it creates a new table to store rows of the collection object.
-   Due to the above limitation, you can't have a list of primitives. I wanted to include a List and could not.
-   If you use an inheritance hierarchy, you are going to create a *lot* of database tables. Instead of flattening, each type becomes its own table, and inherited class tables contain a key to link it to the base class data.
-   If your saga class features a has-a relationship with another class, for the purposes of grouping several related properties together, this is flattened. The resulting database column name is named after the container object property name, then the specific class property name.
-   Regardless of what kind of data you intend to put in a string, it will always be represented in the database as nvarchar(255). This is a big problem. As NHibernate is internalized into NServiceBus with IL Merge, it's not possible to modify this behavior with attributes or fluent configuration. There are really only two options. First, I could override the persistence of the saga data by including my own embedded hbm.xml files, but knowing next to nothing about NHibernate, this isn't much of an option for me. Second, I could build the "core only" version of NServiceBus and include NHibernate on my own, but that is a lot more than I want to get into, much less maintain long term.

When you think about each of these things, it really does make sense and serves for a good general purpose saga storage solution. However, it just wasn't working for me. I wanted an inheritance hierarchy, and lists of primitives, and I know the database is going to get hard and frequently; I didn't want to require that dozens of rows from a half dozen tables (that woudl get locked for the duration of the transaction, by the way) be loaded to create one instance of saga data.

Moreover, I didn't have that much experience with NHibernate, wasn't that comfortable with it, and wanted something that was just easier. I wasn't looking forward to fixing sagas that worked perfectly under the NServiceBus.Lite profile when they moved into integration and production. I didn't want to manage the schema creation that creating each new saga data type would entail. I wanted something low maintenance.

What is low maintenance for me is XML serialization. With an XML-serialization-driven saga persister, I could look at all the current sagas in one table, and an average human could inspect the XML and see what's going on. It's been around a long time and I'm good at it, and it feels more effortless.

## Implementation

At its most basic level, implementing a saga persister involves implementing the ISagaPersister interface:

-   void Complete(ISagaData saga)
-   T Get(string property, object value)
-   T Get(Guid sagaId)
-   void Update(ISagaEntity saga)
-   void Save(ISagaEntity saga)

Unfortunately, that's a bit simplistic, as it misses the requirement of participating in the ambient NServiceBus message handling transaction.

Saga data is loaded before the NServiceBus message handler, and must place appropriate locks on the database so that another message from the same saga cannot modify saga data non-transactionally. This means the database connection used to retrieve the saga must not be disposed until the end of the message handling lifecycle, when the saga is either saved, updated, or completed.

In order to do this, you need to introduce the concept of a session like NHibernate does, and take advantage of NServiceBus's use of fixed threads for message processing to store the session in a ThreadStatic variable.

This is the code for the session - all it really does is provides a method to get a SqlConnection that is shared throughout the session. It is assumed that you are not using Enlist=false in your connection string, and that MSDTC is enabled so that you can use distributed transactions.

    public class XmlSagaSession : IDisposable
    {
        private string connStr;
        private SqlConnection dbConnection;
        internal XmlSagaSession(string connStr)
        {
            this.connStr = connStr;
        }
        public SqlConnection GetConnection()
        {
            if (dbConnection == null)
            {
                dbConnection = new SqlConnection(connStr);
                dbConnection.Open();
            }
            return dbConnection;
        }
        public void Dispose()
        {
            if (dbConnection != null)
            {
                dbConnection.Close();
                dbConnection.Dispose();
                dbConnection = null;
            }
        }
    }

Next, we introduce a session factory to store the current saga in a ThreadStatic variable and provide methods to manage the current saga.

    public class XmlSagaSessionFactory
    {
        public string ConnectionString { get; set; }
        [ThreadStatic]
        private static XmlSagaSession current;
        public XmlSagaSession Begin()
        {
            if(current != null)
                throw new InvalidOperationException("Current session already exists.");
            XmlSagaSession session = new XmlSagaSession(ConnectionString);
            current = session;
            return current;
        }
        public XmlSagaSession Current
        {
            get { return current; }
        }
        public void Complete()
        {
            var c = current;
            current = null;
            if(c != null)
                c.Dispose();
        }
    }

First, notice the ConnectionString property. I intend to inject this value with the IoC container later. The ThreadStatic attribute ensures that the current saga data will be unique per thread. Note that this also means that it will not be cleared out automatically - we must manage this ourselves. For that reason, the Begin method checks to make sure we don't create a new session when one already exists.

The next step is a message module, which is a construct that allows code to be run before and after the message handler. This turns out to be really simple, and could likely be merged with the session factory, but I was following along with the NHibernate persister and its patterns, and saw no reason to change it once I had it working.

    public class XmlSagaMessageModule : IMessageModule
    {
        public XmlSagaSessionFactory Factory { get; set; }
        public void HandleBeginMessage()
        {
            Factory.Begin();
        }
        public void HandleEndMessage()
        {
            Factory.Complete();
        }
        public void HandleError()
        {
            Factory.Complete();
        }
    }

The Factory will be injected by the dependency injection container, and the methods that implement IMessageModule really just call corresponding methods on the session factory.

All that's left is to actually implement ISagaPersister, which at a high level is really just CRUD operations for saga data.

However, one important hurdle is left to overcome. Sagas can be retrieved by Id, which is easy, but they must also be accessible by any arbitrary property value. This presents a problem if the entire saga data is serialized to XML, since it would not be performant to scan through the XML in any arbitrary way imaginable. Even with an indexed XML column, I wasn't sure if I could get enough efficiency once I got to the point where I had hundreds or thousands of sagas active at a time.

So, I decided to introduce an attribute that would decorate the saga data class and identify the property or properties that could be used to retrieve it. The save and update methods will take note of these attributes, use reflection to get their values, and add the information to an index table that will enable a lookup of the saga's Id. The get method will also take note of these attributes and throw an exception if an attempt is made to return a saga on an unindexed property. This will prevent a saga that works well in the Lite profile (with in-memory saga persister) from suddenly blowing up when it is moved to Integration or Production.

    [AttributeUsage(AttributeTargets.Class)]
    public class SagaIndexAttribute : Attribute
    {
        public string PropertyName { get; private set; }
        public SagaIndexAttribute(string propertyName)
        {
            this.PropertyName = propertyName;
        }
    }

As far as attributes go, it really doesn't get a lot simpler than that. I elected to make this a class attribute because it is far easier to request a set of attributes once from the class type than to enumerate the attributes of all its sub-properties. The following class is internal to the saga persister, and facilitates retrieving the indexable values.

    internal class SagaIndexAccessor
    {
        internal string PropertyName { get; private set; }
        private PropertyInfo propInfo;
        private SagaIndexAccessor(Type type, SagaIndexAttribute attribute)
        {
            this.PropertyName = attribute.PropertyName;
            this.propInfo = type.GetProperty(attribute.PropertyName);
        }
        internal string GetValue(ISagaEntity saga)
        {
            object obj = this.propInfo.GetValue(saga, null);
            if (obj == null)
                return null;
            return obj.ToString();
        }
        internal static bool IsIndexed(Type type, string propertyName)
        {
            return GetIndexes(type).Any(i => i.PropertyName == propertyName);
        }
        internal static SagaIndexAccessor[] GetIndexes(Type type)
        {
            return type.GetCustomAttributes(typeof(SagaIndexAttribute), true)
                .Cast()
                .Select(a => new SagaIndexAccessor(type, a))
                .ToArray();
        }
    }

Now, a few utility methods: GetIndexes creates a DataTable containing indexable data that can be passed to SQL 2008 as a table-valued parameter. Deserialize returns the correctly-typed saga data from a SqlXml instance, and Sproc saves me from rewriting the boring code necessary to retrieve a SqlCommand object.

    private DataTable GetIndexes(Type type, ISagaEntity saga)
    {
        DataTable dt = new DataTable();
        dt.Columns.Add("Property", typeof(string));
        dt.Columns.Add("Value", typeof(string));
        foreach (var index in SagaIndexAccessor.GetIndexes(type))
            dt.Rows.Add(new object[] { index.PropertyName, index.GetValue(saga) });
        return dt;
    }
    private T Deserialize(SqlXml sxml)
        where T : ISagaEntity
    {
        if (sxml == null)
            return default(T);
        XmlSerializer xs = new XmlSerializer(typeof(T));
        return (T)xs.Deserialize(sxml.CreateReader());
    }
    private SqlCommand Sproc(string name)
    {
        SqlConnection conn = SessionFactory.Current.GetConnection();
        SqlCommand cmd = conn.CreateCommand();
        cmd.CommandText = name;
        cmd.CommandType = System.Data.CommandType.StoredProcedure;
        return cmd;
    }

Here is the SQL definitions of the data table, index table, and the table-valued parameter type needed to perform all operations with one stored procedure call. I tried to simplify SQL's script output for maximum readability:

    CREATE TABLE dbo.SagaData
    (
        Id uniqueidentifier NOT NULL,
        CreatedUtc datetime NOT NULL,
        UpdatedUtc datetime NOT NULL,
        Data xml NOT NULL,
        CONSTRAINT PK_SagaData PRIMARY KEY CLUSTERED (Id ASC)
    )
    GO
    ALTER TABLE dbo.SagaData ADD  CONSTRAINT DF_SagaData_Created DEFAULT (getutcdate()) FOR CreatedUtc
    GO
    ALTER TABLE dbo.SagaData ADD  CONSTRAINT DF_SagaData_UpdatedUtc DEFAULT (getutcdate()) FOR UpdatedUtc
    GO
    CREATE TABLE dbo.SagaDataIndex
    (
        Type varchar(255) NOT NULL,
        Property varchar(100) NOT NULL,
        Value nvarchar(255) NOT NULL,
        SagaId uniqueidentifier NOT NULL,
        CONSTRAINT PK_SagaDataIndex PRIMARY KEY CLUSTERED (Type ASC,Property ASC,    Value ASC)
    )
    GO
    ALTER TABLE dbo.SagaDataIndex  WITH CHECK ADD  CONSTRAINT FK_SagaDataIndex_SagaData FOREIGN KEY(SagaId)
    REFERENCES dbo.SagaData (Id)
    ON DELETE CASCADE
    GO
    ALTER TABLE dbo.SagaDataIndex CHECK CONSTRAINT FK_SagaDataIndex_SagaData
    GO
    CREATE TYPE dbo.SagaDataIndexItem AS TABLE
    (
        Property varchar(100) NOT NULL,
        Value nvarchar(255) NOT NULL,
        PRIMARY KEY CLUSTERED ( Property ASC,    Value ASC)
    )
    GO
    -- This permission is required to use a table-valued parameter in a stored procedure
    GRANT EXECUTE ON TYPE::dbo.SagaDataIndexItem to public;

Now for the stored procedures. We'll start with the first and most complex, the Save/Update operation (which are done by the same procedure as an atomic insert/update operation):

    CREATE procedure dbo.nsb_SagaData_Save
        @Id uniqueidentifier,
        @Type varchar(255),
        @Indexes dbo.SagaDataIndexItem READONLY,
        @Data xml
    AS
    declare @Now datetime = GetUtcDate()
    update SagaData with (serializable) set UpdatedUtc = @Now, Data = @Data where Id = @Id
    if @@ROWCOUNT = 0
        insert into SagaData (Id, CreatedUtc, UpdatedUtc, Data) values (@Id, @Now, @Now, @Data)
    else
        delete from SagaDataIndex where SagaId = @Id
    insert into SagaDataIndex (Type, Property, Value, SagaId)
    select @Type, Property, Value, @Id
    from @Indexes
    GO

Notice how my atomic insert/update semantics assume that updates will be more frequent than inserts, and optimize for that. It is my assumption that most sagas will be inserted by the IAmStartedByMessages message, and then will be updated many times.

One of two paths can happen in the procedure. Either the saga is updated, in which case the indexes are deleted so they can be reinserted, or the saga is inserted, in which case it can be assumed that there is no existing index data to delete. So in both cases, the index data from the table-valued parameter is inserted straight into the index table.

Also, most of the time when doing an atomic insert/update pattern, I would surround the whole thing with a begin transaction / commit transaction boundary, but I am making the assumption that the stored procedure will be called under transaction control.

Now I'll show the other procedures for Get by ID, Get by Property, and Complete, which are fairly boring by comparison:

    CREATE procedure dbo.nsb_SagaData_GetById
        @Id uniqueidentifier
    AS
    select TOP 1 Data
    from SagaData with (serializable)
    where Id = @Id
    GO
    CREATE procedure dbo.nsb_SagaData_GetByProperty
        @Type varchar(255),
        @Property varchar(128),
        @Value nvarchar(255)
    AS
    declare @Id uniqueidentifier
    select @Id = SagaId
    from SagaDataIndex with (nolock)
    where Type = @Type
        and Property = @Property
        and Value = @Value
    select TOP 1 Data
    from SagaData with (serializable)
    where Id = @Id
    GO
    CREATE procedure dbo.nsb_SagaData_Complete
        @Id uniqueidentifier
    AS
    delete from SagaData where Id = @Id
    GO

With the procedures doing most of the heavy lifting, all that remains to fill out ISagaPersister is to write the code that calls the procedures.

    public class XmlSagaPersister : ISagaPersister
    {
        public XmlSagaSessionFactory SessionFactory { get; set; }
        public void Complete(ISagaEntity saga)
        {
            using (var cmd = Sproc("nsb_SagaData_Complete"))
            {
                cmd.Parameters.AddWithValue("@Id", saga.Id);
                cmd.ExecuteNonQuery();
            }
        }
        public T Get(string property, object value)
            where T : ISagaEntity
        {
            if (property == "Id" && value.GetType() == typeof(Guid))
                return Get((Guid)value);
            Type type = typeof(T);
            if (!SagaIndexAccessor.IsIndexed(type, property))
                throw new InvalidOperationException(String.Format("In order to look up a {0} instance by property '{1}' you must decorate the {0} class with the SagaInstanceAttribute.", type.Name, property));
            SqlXml sxml = null;
            using (var cmd = Sproc("nsb_SagaData_GetByProperty"))
            {
                cmd.Parameters.AddWithValue("@Type", type.FullName);
                cmd.Parameters.AddWithValue("@Property", property);
                cmd.Parameters.AddWithValue("@Value", value.ToString());
                using (SqlDataReader r = cmd.ExecuteReader())
                {
                    if (r.Read())
                        sxml = r.GetSqlXml(0);
                }
            }
            return Deserialize(sxml);
        }
        public T Get(Guid sagaId)
            where T : ISagaEntity
        {
            SqlXml sxml = null;
            using (var cmd = Sproc("nsb_SagaData_GetById"))
            {
                cmd.Parameters.AddWithValue("@Id", sagaId);
                using (SqlDataReader r = cmd.ExecuteReader())
                {
                    if (r.Read())
                        sxml = r.GetSqlXml(0);
                }
            }
            return Deserialize(sxml);
        }
        public void Update(ISagaEntity saga)
        {
            Save(saga);
        }
        public void Save(ISagaEntity saga)
        {
            Type type = saga.GetType();
            DataTable indexes = GetIndexes(type, saga);
            XmlSerializer xs = new XmlSerializer(type);
            using (MemoryStream ms = new MemoryStream())
            {
                using (XmlTextWriter xw = new XmlTextWriter(ms, Encoding.UTF8))
                {
                    xs.Serialize(xw, saga);
                    SqlXml sxml = new SqlXml(ms);
                    using (var cmd = Sproc("nsb_SagaData_Save"))
                    {
                        cmd.Parameters.AddWithValue("@Id", saga.Id);
                        cmd.Parameters.AddWithValue("@Type", type.FullName);
                        SqlParameter p = cmd.Parameters.AddWithValue("@Indexes", indexes);
                        p.SqlDbType = SqlDbType.Structured;
                        p.TypeName = "dbo.SagaDataIndexItem";
                        cmd.Parameters.AddWithValue("@Data", sxml);
                        cmd.ExecuteNonQuery();
                    }
                }
            }
        }
        // The following already shown above:
        // private DataTable GetIndexes(Type type, ISagaEntity saga)
        // private T Deserialize(SqlXml sxml) where T : ISagaEntity
        // private SqlCommand Sproc(string name)
        // internal class SagaIndexAccessor { }
    }

The last step is registering the saga persister with the NServiceBus configuration. This is one part where I admittedly skimped. I did not include all the niceties and configuration classes and extension methods that would be expected if this were to be included in an NServiceBus release, but I've already stated that this isn't really appropriate for an NServiceBus release, so I don't really care. I leave it to someone else to create a version that's fully configurable, or supports schema generation if none exists, or whatever. Go ahead and take this code as a starting point. However, I am willing to bet that my added requirement of an index attribute is a fatal flaw that would prevent this model from reaching that point, but it's an extra requirement I'm glad to live with.

In any case, you can't simply add this to the NServiceBus.Integration or NServiceBus.Production profiles, because bad things happen when two saga persisters are registered, I rolled my own saga, which was fairly easy to do by finding IHandleProfile in Reflector and then navigating to the derived classes, and using that code as a starting point.

So in my setup, I have a MyIntegration and MyProduction profile. The main difference is that they target different databases. I'm sure you could just as easily use similar code from an IConfigureThisEndpoint class in a self-hosted endpoint.

    public class MyIntegrationProfileHandler : IHandleProfile, IHandleProfile, IWantTheEndpointConfig
    {
        public IConfigureThisEndpoint Config { get; set; }
        public override void ProfileActivated()
        {
            if (NServiceBus.Sagas.Impl.Configure.SagasWereFound)
            {
                string connStr = "..."; // Get your connection string however you're comfortable
                // Register session factory which takes care of managing
                // the database connections and transactions
                Configure.Instance.Configurer.ConfigureComponent(typeof(XmlSagaSessionFactory), ComponentCallModelEnum.Singlecall)
                    .ConfigureProperty("ConnectionString", connStr);
                // Then register the saga persister itself
                Configure.Instance.Configurer.ConfigureComponent(typeof(XmlSagaPersister), ComponentCallModelEnum.Singlecall);
            }
            // This is simply copied from the NServiceBus.Production profile handler.
            // Could just as easily use MsmqSubscriptionStorage
            if (this.Config is AsA_Publisher)
            {
                Configure.Instance.DBSubcriptionStorage();
            }
        }
    }

## Conclusion

My implementation of an ISagaPersister is, I'm sure, far from perfect. Some improvements that could be made:

-   Remove the need for an attribute to identify index properties by utilizing an XML index or some other enterprising solution.
-   Add all the niceties of a Configure class with extension methods to enable easy use of the saga persister from within a fluent configuration block.
-   Add the ability to auto-create necessary database schema if necessary.

I hope at the very least I've shown how an important chunk of the NServiceBus framework can be swapped out for another implementation. In fact, this is one of my favorite things about NServiceBus. As an architect, I can extend the base in ways that will help all the other developers on my team work more effectively and efficiently.
