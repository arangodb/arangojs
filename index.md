# arangojs

The official ArangoDB low-level JavaScript client.

**Note:** if you are looking for the ArangoDB JavaScript API in
[Foxx](https://foxx.arangodb.com) (or the `arangosh` interactive shell) please
refer to the documentation about the
[`@arangodb` module](https://www.arangodb.com/docs/stable/foxx-reference-modules.html#the-arangodb-module)
instead; specifically
[the `db` object exported by the `@arangodb` module](https://www.arangodb.com/docs/stable/appendix-references-dbobject.html).
The JavaScript driver is **only** meant to be used when accessing ArangoDB from
**outside** the database.

## Versions

<ul>
{% for version in site.data.versions.all %}
<li><a href="{{ version }}/index.html">{{ version }}</a>{% unless site.data.versions.stable contains version %} (pre-release){% elsif version == site.data.versions.stable.first %} (latest){% endunless %}</li>
{% endfor %}
<li><a href="devel/index.html">devel</a></li>
</ul>

Read the [CHANGELOG](CHANGELOG) for information about changes between versions.
