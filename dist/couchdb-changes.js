/*
  CouchDb changes works with longpolling
  Create your change object: (I do this in my route)

    Application.MyRoute = Ember.Route.extend
      setupController: (controller, model) ->
        DS.CouchDBChanges.create({
          db: "my_couch_db"
          context: @ #for calling filter with data
          filter: @filter #pass function for filtering results
        })

      filter: (data) ->
        #this is filter function for changes
        data.forEach (changeItem) ->
          switch changeItem.doc.type
            when "my model type"
              #works with your model this
*/


(function() {
  DS.CouchDBChanges = Ember.Object.extend({
    db: null,
    since: null,
    filter: null,
    callbackFilter: (function(data) {}),
    context: this,
    include_docs: true,
    limit: null,
    descending: false,
    heartbeat: 60000,
    timeout: 60000,
    couchdbFilter: null,
    style: "main_only",
    continuous: function() {
      var url;

      this._checkDb();
      url = this._getUrl("continuous");
      return this._ajax(this._withParams(url));
    },
    normal: function() {
      var url;

      this._checkDb();
      url = this._getUrl("normal");
      return this._ajax(this._withParams(url));
    },
    longpoll: function() {
      var url;

      this._checkDb();
      url = this._getUrl("longpoll");
      return this._ajax(this._withParams(url));
    },
    _ajax: function(url) {
      var _this = this;

      return $.ajax({
        type: "GET",
        url: url,
        dataType: 'json',
        success: function(data) {
          var _ref;

          if ((data != null ? (_ref = data.results) != null ? _ref.length : void 0 : void 0) && _this.get('since')) {
            _this.get('callbackFilter').call(_this.get('context'), data.results);
          }
          _this.set('since', data.last_seq);
          return _this.longpoll();
        }
      });
    },
    _withParams: function(url) {
      var _this = this;

      if (this.get('since')) {
        ["include_docs", "limit", "descending", "heartbeat", "timeout", "filter", "style", "since"].forEach(function(prop) {
          if (_this.get(prop)) {
            return url += "&" + prop + "=" + (_this.get(prop));
          }
        });
      }
      return url;
    },
    _checkDb: function() {
      if (!this.get('db')) {
        throw "You mast add db name";
      }
    },
    _getUrl: function(type) {
      if (this.get('since')) {
        return "/%@/_changes?feed=%@".fmt(this.get('db'), type);
      } else {
        return "/%@/_changes?descending=true&limit=1".fmt(this.get('db'));
      }
    }
  });

}).call(this);
