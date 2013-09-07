/*
  This object is a simple json based serializer with advanced conviniences for
  managing CouchDB entities.

@namespace EmberCouchDBKit 
@class DocumentSerializer
@extends DS.RESTSerializer.extend
*/


(function() {
  EmberCouchDBKit.DocumentSerializer = DS.RESTSerializer.extend({
    primaryKey: 'id',
    normalize: function(type, hash, prop) {
      this.normalizeId(hash);
      this.normalizeUsingDeclaredMapping(type, hash);
      this.normalizeAttributes(type, hash);
      this.normalizeRelationships(type, hash);
      if (this.normalizeHash && this.normalizeHash[prop]) {
        return this.normalizeHash[prop](hash);
      }
      return this._super(type, hash, prop);
    },
    normalizeId: function(hash) {
      if (!hash[this.get('primaryKey')]) {
        hash.id = hash["_id"];
        return delete hash["_id"];
      }
    }
  });

  /*
  
    An `DocumentAdapter` is a main adapter for connecting your models with CouchDB documents.
  
    Let's consider a simple model:
  
      ```
      EmberApp.CouchDBModel = DS.Model.extend
         title: DS.attr('title')
  
      EmberApp.Store.registerAdapter('EmberApp.CouchDBModel', EmberCouchDBKit.DocumentAdapter.extend({db: 'my_couchdb'}))
      ```
  
    The following available operations:
  
      ```
        # GET /my_couchdb/:id
        EmberApp.CouchDBModel.find("id")
  
        # POST /my_couchdb
        EmberApp.CouchDBModel.create({type: "my_type", title: "title"})
  
        # PUT /my_couchdb/:id
        model = EmberApp.CouchDBModel.find("id")
        model.set('title', 'new_title')
        model.get('store').commit()
  
        # DELETE /my_couchdb/:id
        model.deleteRecord()
      ```
  
    In additional, the following relations also available for getting and pushing related models:
  
      ```
      EmberApp.Post = DS.Model.extend
         type: DS.attr('string', defaultValue: 'post')
         title: DS.attr('string')
  
         # {"owner": "person@example.com"}
         owner:  DS.belongsTo('EmberApp.User', { key: 'owner': true})
         owner_key: 'email'
  
         # {"people":["person1@example.com", "person2@example.com"]}
         people: DS.hasMany('EmberApp.User',   { key: 'people', embedded: true})
         people_key: 'email'
      ```
  
    You can use `find` method for quering design views:
  
      ```
      tasks = EmberApp.Task.find({type: "view", designDoc: 'tasks', viewName: "by_assignee", options: 'include_docs=true&key="%@"'.fmt(@get('email'))})
      array = tasks.get('content')
      # => Array[EmberApp.Task,..]
      ```
  
    ## Tip and tricks
  
    Getting a raw document object
  
      ```
      doc = EmberApp.CouchDBModel.find('myId')
      raw_json = doc.get('_data.raw')
      # => Object {_id: "...", _rev: "...", …}
  
    Creating a named document
  
      ```
      myDoc = EmberApp.CouchDBModel.createRecord({id: 'myId'})
      # …
      myDoc = EmberApp.CouchDBModel.find('myId')
      # => Object {id: "myId", …}
  
    If you wonder about some document which could be missed in your db, then you could use a simple `is` convenience
  
      ```
      doc = EmberApp.CouchDBModel.find(myId)
      doc.get('store.adapter').is(200, {for: doc})
      # => true
      doc.get('store.adapter').is(404, {for: doc})
      # => undefined
      ```
  
    You're able to fetch a `HEAD` for your document
  
      ```
      doc = EmberApp.CouchDBModel.find(myId)
      doc.get('store.adapter').head(doc).getAllResponseHeaders()
      # => "Date: Sat, 31 Aug 2013 13:48:30 GMT
      #    Cache-Control: must-revalidate
      #    Server: CouchDB/1.3.1 (Erlang OTP/R15B03)
      #    Connection: keep-alive
      #    ..."
      ```
  
  
  @namespace EmberCouchDBKit
  @class DocumentAdapter
  @extends DS.Adapter
  */


  EmberCouchDBKit.DocumentAdapter = DS.Adapter.extend({
    typeAttribute: 'ember_type',
    typeViewName: 'by-ember-type',
    customTypeLookup: false,
    is: function(status, h) {
      if (this.head(h["for"]).status === status) {
        return true;
      }
    },
    head: function(h) {
      var docId;

      docId = typeof h === "object" ? h.get('id') : h;
      return this.ajax(docId, 'HEAD', {
        async: false
      });
    },
    ajax: function(url, type, modelType, hash) {
      return this._ajax('/%@/%@'.fmt(this.get('db'), url || ''), type, modelType, hash);
    },
    _ajax: function(url, type, modelType, hash) {
      var adapter;

      if (hash == null) {
        hash = {};
      }
      adapter = this;
      return new Ember.RSVP.Promise(function(resolve, reject) {
        var headers, _data;

        if (url.split("/").pop() === "") {
          url = url.substr(0, url.length - 1);
        }
        hash.url = url;
        hash.type = type;
        hash.dataType = 'json';
        hash.contentType = 'application/json; charset=utf-8';
        hash.context = adapter;
        if (hash.data && type !== 'GET') {
          _data = hash.data;
          hash.data = JSON.stringify(hash.data);
        }
        if (adapter.headers) {
          headers = adapter.headers;
          hash.beforeSend = function(xhr) {
            return forEach.call(Ember.keys(headers), function(key) {
              return xhr.setRequestHeader(key, headers[key]);
            });
          };
        }
        if (!hash.success) {
          hash.success = function(json) {
            var _modelJson;

            if (!_data) {
              _data = {};
            }
            adapter._normalizeRevision(json);
            _modelJson = {};
            _modelJson[modelType] = $.extend(_data, json);
            return Ember.run(null, resolve, _modelJson);
          };
        }
        hash.error = function(jqXHR, textStatus, errorThrown) {
          if (jqXHR) {
            jqXHR.then = null;
          }
          return Ember.run(null, reject, jqXHR);
        };
        return Ember.$.ajax(hash);
      });
    },
    _normalizeRevision: function(json) {
      if (json._rev) {
        json.rev = json._rev;
        return delete json._rev;
      }
    },
    shouldCommit: function(record, relationships) {
      return this._super.apply(arguments);
    },
    stringForType: function(type) {
      return this.get('serializer').stringForType(type);
    },
    find: function(store, type, id) {
      if (this._checkForRevision(id)) {
        return this.findWithRev(store, type, id);
      } else {
        return this.ajax(id, 'GET', type.typeKey);
      }
    },
    findWithRev: function(store, type, id) {
      var _id, _ref, _rev;

      _ref = id.split("/").slice(0, 2), _id = _ref[0], _rev = _ref[1];
      return this.ajax("%@?rev=%@".fmt(_id, _rev), 'GET');
    },
    findManyWithRev: function(store, type, ids) {
      var _this = this;

      return ids.forEach(function(id) {
        return _this.findWithRev(store, type, id);
      });
    },
    findMany: function(store, type, ids) {
      var data;

      if (this._checkForRevision(ids[0])) {
        return this.findManyWithRev(store, type, ids);
      } else {
        data = {
          include_docs: true,
          keys: ids
        };
        return this.ajax('_all_docs?include_docs=true', 'POST', {
          data: data
        });
      }
    },
    findQuery: function(store, type, query, modelArray) {
      var designDoc;

      if (query.type === 'view') {
        designDoc = query.designDoc || this.get('designDoc');
        return this.ajax('_design/%@/_view/%@'.fmt(designDoc, query.viewName), 'GET', {
          context: this,
          data: query.options,
          success: function(data) {
            var recordDef;

            recordDef = {};
            recordDef[designDoc] = data.rows.getEach('doc');
            return Ember.run(null, resolve, recordDef);
          }
        });
      }
    },
    findAll: function(store, type) {
      var data, designDoc, params, typeString, typeViewName, viewName;

      designDoc = this.get('designDoc');
      if (this.get('customTypeLookup') && this.viewForType) {
        params = {};
        viewName = this.viewForType(type, params);
        params.include_docs = true;
        return this.ajax('_design/%@/_view/%@'.fmt(designDoc, viewName), 'GET', {
          data: params,
          success: function(data) {
            return Ember.run(null, resolve, data.rows.getEach('doc'));
          }
        });
      } else {
        typeViewName = this.get('typeViewName');
        typeString = this.stringForType(type);
        data = {
          include_docs: true,
          key: '"' + typeString + '"'
        };
        return this.ajax('_design/%@/_view/%@'.fmt(designDoc, typeViewName), 'GET', {
          data: data,
          success: function(data) {
            return Ember.run(null, resolve, data.rows.getEach('doc'));
          }
        });
      }
    },
    createRecord: function(store, type, record) {
      var json;

      json = store.serializerFor(type.typeKey).serialize(record);
      return this._push(store, type, record, json);
    },
    updateRecord: function(store, type, record) {
      var json;

      json = this.serialize(record, {
        associations: true,
        includeId: true
      });
      return this._push(store, type, record, json);
    },
    deleteRecord: function(store, type, record) {
      return this.ajax("%@?rev=%@".fmt(record.get('id'), record.get('_data._rev')), 'DELETE', {});
    },
    _updateAttachmnets: function(record, json) {
      var _attachments;

      _attachments = {};
      record.get('attachments').forEach(function(item) {
        var attachment;

        attachment = EmberCouchDBKit.AttachmentStore.get(item.get('id'));
        return _attachments[item.get('file_name')] = {
          content_type: attachment.content_type,
          digest: attachment.digest,
          length: attachment.length,
          stub: attachment.stub,
          revpos: attachment.revpos
        };
      });
      json._attachments = _attachments;
      return delete json.attachments;
    },
    _checkForRevision: function(id) {
      (id != null ? id.split("/").length : void 0) > 1;
      return id.split("/").length > 1;
    },
    _push: function(store, type, record, json) {
      var id, method;

      id = record.get('id') || '';
      method = record.get('id') ? 'PUT' : 'POST';
      if (record.get('_data.rev')) {
        json._rev = record.get('_data.rev');
      }
      return this.ajax(id, method, type.typeKey, {
        data: json
      });
    }
  });

}).call(this);
