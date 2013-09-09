/*
  This object is a simple json based serializer with advanced `extractHasMany` convinience for
  extracting all document's revisions and prepare them for further loading.

@namespace EmberCouchDBKit 
@class RevsSerializer
@extends DS.JSONSerializer
*/


(function() {
  EmberCouchDBKit.RevsSerializer = DS.RESTSerializer.extend({
    primaryKey: 'id',
    normalize: function(type, hash, prop) {
      this.normalizeHistories(hash, type.typeKey, hash);
      return this._super(type, hash, prop);
    },
    extractId: function(type, hash) {
      return hash._id || hash.id;
    },
    normalizeHistories: function(hash, type) {
      hash["histories"] = EmberCouchDBKit.RevsStore.mapRevIds(this.extractId(type, hash));
      return hash["prev_history"] = EmberCouchDBKit.RevsStore.mapRevIds(this.extractId(type, hash))[1];
    }
  });

  /*
    An `RevsAdapter` is an object which gets revisions info by distinct document and used
    as a main adapter for `Revision` models.
  
    Let's consider an usual use case:
  
      ```
      App.Task = DS.Model.extend
        title: DS.attr('string')
        history: DS.belongsTo('App.History')
  
      App.Store.registerAdapter('App.Task', EmberCouchDBKit.DocumentAdapter.extend({db: 'docs'}))
  
      App.History = DS.Model.extend
        tasks: DS.hasMany('App.Task', {key: "tasks", embedded: true})
        prev_task: DS.belongsTo('App.Task', {key: "prev_task", embedded: true})
  
  
      App.Store.registerAdapter('App.History', EmberCouchDBKit.RevsAdapter.extend({db: 'docs'}))
      ```
  
    So, the `App.Task` model is able to load its revisions as a regular `App.Task` models.
  
      ```
      task = App.Task.find("3bbf4b8c504134dd125e7b603b004b71")
  
      revs_tasks = task.history.tasks
      # => Ember.Enumerable<App.Task>
      ```
  
  @namespace EmberCouchDBKit
  @class RevsAdapter
  @extends DS.Adapter
  */


  EmberCouchDBKit.RevsAdapter = DS.Adapter.extend({
    find: function(store, type, id) {
      return this.ajax("%@?revs_info=true".fmt(id.split("/")[0]), 'GET', {
        context: this
      });
    },
    updateRecord: function(store, type, record) {},
    deleteRecord: function(store, type, record) {},
    ajax: function(url, type, hash) {
      return this._ajax('/%@/%@'.fmt(this.get('db'), url || ''), type, hash);
    },
    _ajax: function(url, type, hash) {
      if (url.split("/").pop() === "") {
        url = url.substr(0, url.length - 1);
      }
      hash.url = url;
      hash.type = type;
      hash.dataType = 'json';
      hash.contentType = 'application/json; charset=utf-8';
      hash.context = this;
      if (hash.data && type !== 'GET') {
        hash.data = JSON.stringify(hash.data);
      }
      return new Ember.RSVP.Promise(function(resolve, reject) {
        return Ember.$.ajax(hash);
      });
    }
  });

}).call(this);
