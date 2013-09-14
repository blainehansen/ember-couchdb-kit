var App = Ember.Application.create();

App.Boards = ['common', 'intermediate', 'advanced'];


// Models

App.ApplicationAdapter =  EmberCouchDBKit.DocumentAdapter.extend({db: 'boards'});
App.ApplicationSerializer = EmberCouchDBKit.DocumentSerializer.extend();

App.AttachmentAdapter = EmberCouchDBKit.AttachmentAdapter.extend({db: 'boards'});
App.AttachmentSerializer = EmberCouchDBKit.AttachmentSerializer.extend();

App.Issue = DS.Model.extend({
  text: DS.attr('string'),
  type: DS.attr('string', {defaultValue: 'issue'}),
  attachments: DS.hasMany('attachment', {async: true})
});

App.Attachment = DS.Model.extend({
  content_type: DS.attr('string'),
  length: DS.attr('number'),
  file_name: DS.attr('string'),
  db: DS.attr('string', {defaultValue: 'boards'})
});

App.Position = DS.Model.extend({
  issues: DS.hasMany('issue', {async: true}),
  type: DS.attr('string', {defaultValue: 'position'})
});

// Routes

App.IndexRoute = Ember.Route.extend({

  setupController: function(controller, model) {
    this._setupPositionHolders();

   this._position();
   this._issue();
  },

  renderTemplate: function() {
    this.render();
    // link particular controller with its outlet
    var self = this;
    App.Boards.forEach(function(label) {
       self.render('board',{outlet: label, into: 'index', controller: label});
    });
  },

  _setupPositionHolders: function() {
    var self = this;
    App.Boards.forEach(function(type) {
      // set issues into appropriate controller through position model
      self.get('store').find('position', type).then(function(position){
        self.controllerFor(type).set('position', position);
      });
      // create position documents (as a part of first time initialization)
//        TODO!
//      if (position.get('store.adapter').is(404, {for: type})) {
//        App.Position.createRecord({ id: type }).get('store').commit();
//      }
    });
  },

  _position: function(){
    // create a CouchDB `/_change` listener which serves an position documents
    params = { include_docs: true, timeout: 100, filter: 'issues/only_positions'}
    position = EmberCouchDBKit.ChangesFeed.create({ db: 'boards', content: params });

    // all upcoming changes are passed to `_handlePositionChanges` callback through `fromTail` strategy
    var self = this;
    position.fromTail(function(){
      position.longpoll(self._handlePositionChanges, self);
    });
  },

  _handlePositionChanges: function(data) {
    var self = this;
    data.forEach(function(obj){
      var position = self.controllerFor(obj.doc._id).get('position');
      // we should reload particular postion model in case of update is received from another user
      if (position.get('_data._rev') != obj.doc._rev)
        position.reload();
    });
  },

  _issue: function() {
    // create a CouchDB `/_change` issue listener which serves an issues
    var params = { include_docs: true, timeout: 100, filter: 'issues/issue'};
    var issue = EmberCouchDBKit.ChangesFeed.create({ db: 'boards', content: params });

    // all upcoming changes are passed to `_handleIssueChanges` callback through `fromTail` strategy
    var self = this;
    issue.fromTail(function(){
      issue.longpoll(self._handleIssueChanges, self);
    });
  },

  _handleIssueChanges: function(data) {
    var self = this;
    // apply received updates
    data.forEach(function(obj){
      var issue = self.get('store').find('issue', obj.doc._id).then(function(){
        issue.reload();
      })
    });
  }
});



// Controllers

App.IndexController = Ember.Controller.extend({

  content: Ember.computed.alias('position.issues'),

  actions: {
    createIssue: function(text) {
      var self = this;
      var issue = this.get('store').createRecord('issue', {text: text});
      issue.save().then(function(issue) {
        self.get('position.issues').pushObject(issue);
        self.get('position').save().then(function() {
          self.get('position').reload();
        });
      });
    },

    saveIssue: function(model) {
      model.save().then(function(){
        model.reload();
      });
    },

    deleteIssue: function(issue) {
      var self = this;
      self.get('position.issues').removeObject(issue);
      issue.deleteRecord();
      issue.save().then(function(){
        self.get('position').save().then(function() {
          self.get('position').reload();
        });
      })
    },
      
    addAttachment: function(files, model){
      this._actions._addAttachment(0, files, files.length, model, this)
    },

    _addAttachment: function(count, files, size, model, self){
      file = files[count];
      attachmentId = "%@/%@".fmt(model.id, file.name);

      params = {
        doc_id: model.id,
        model_name: App.Issue,
        rev: model._data.rev,
        id: attachmentId,
        file: file,
        content_type: file.type,
        length: file.size,
        file_name: file.name
      }

      var attachment = self.get('store').createRecord('attachment', params);
      attachment.save().then(function() {
        model.get('attachments').pushObject(attachment);
        model.reload();
        Ember.run.next(function() {
          count = count + 1;
          if(count < size){
            self._actions._addAttachment(count, files, size, model, self);
          }
        });
      });
    },

    deleteAttachment: function(attachment){
      attachment.deleteRecord();
      attachment.save();
    },

    dropIssue: function(view, self, viewModel, selfModel) {
      var position = self.get('content').toArray().indexOf(selfModel)
      view.get('content').removeObject(viewModel);
      self.get('content').insertAt(position, viewModel);
      self.get('position').save().then(function() {
        self.get('position').reload();
      });
      if(view.name !== self.name){
        view.get('position').save().then(function() {
          view.get('position').reload();
        });
      }
    }
  }
});

App.CommonController       = App.IndexController.extend({ name: 'common' });
App.IntermediateController = App.IndexController.extend({ name: 'intermediate' });
App.AdvancedController     = App.IndexController.extend({ name: 'advanced' });



//  Views

App.IssueView = Ember.View.extend({
  tagName: "form",
  edit: false,
  attributeBindings: ['draggable'],
  draggable: 'true',

  submit: function(event){
    event.preventDefault();
    if (this.get('edit')){
      this.get('controller').send("saveIssue", this.get('context') );
    }
    this.toggleProperty('edit');
  },

  dragStart: function(event) {
    event.dataTransfer.setData('id', this.get('elementId'));
  },

  dragEnter: function(event) {
    event.preventDefault();
    event.target.style.opacity = '0.4';
  },

  dragOver: function(event) {
    event.preventDefault();
  },

  dragLeave: function(event) {
    event.preventDefault();
    event.target.style.opacity = '1';
  },

  drop: function(event) {
    var view = Ember.View.views[event.dataTransfer.getData('id')];
    this.get('controller').send("dropIssue", view.get('controller'), this.get('controller'), view.get('context'), this.get('context'));
    event.preventDefault();
    event.target.style.opacity = '1';
  }
});


App.NewIssueView = Ember.View.extend({

  tagName: "form",
  create: false,
  attributeBindings: ["style"],
  style: "display:inline",

  submit: function(event){
    this._save(event);
  },

  keyDown: function(event){
    if(event.keyCode == 13){
      this._save(event);
    }
  },

  _save: function(event) {
    event.preventDefault();
    if (this.get('create')){
      text = this.get("TextArea.value");
      if(!Ember.isEmpty(text)){
        this.get('controller').send("createIssue", text);
      }
    }
    this.toggleProperty('create');
  }
});

App.CancelView = Ember.View.extend({
  tagName: "span",
  
  click: function(event){
    event.preventDefault();
    this.set('parentView.create',false);
  }
});

App.DeleteIssueView = Ember.View.extend({
  tagName: "span",

  click: function(event){
    event.preventDefault();
    this.get('controller').send('deleteIssue', this.get('context'));
  }
});

App.DeleteAttachmentView = Ember.View.extend({
  tagName: "span",
  classNames: ['badge'],
  click: function(event){
    event.preventDefault();
    this.get('controller').send('deleteAttachment', this.get('context'));
  }
});

App.AttachmentView = Ember.View.extend({
  
  tagName: "input",
  attributeBindings: ["style", "type", "multiple"],
  style: "display:none",
  type: 'file',
  multiple: true,

  actions: {
    browseFile: function(e){
     this.$().click()
    }
  },

  change: function(event) {
    this.get('controller').send('addAttachment', event.target.files, this.get('context'));
  }
});

Ember.TextArea.reopen({
  attributeBindings: ['viewName'],
  elementDidChange: function() {
    this.$().focus();
  }.observes('element')
});

Ember.Handlebars.helper('linkToAttachment', function(attachment) {
  aTagTemplate= "<a href='%@' target='_blank'>%@</a>"
  url = "/%@/%@".fmt(attachment.get('_data.db'), attachment.get('id'));
  return new Handlebars.SafeString(
    aTagTemplate.fmt(url, attachment.get('file_name'))
  );
});
