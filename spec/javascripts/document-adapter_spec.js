(function() {
  Ember.ENV.TESTING = true;

  describe('EmberCouchDBKit.DocumentAdapter', function() {
    beforeEach(function() {
      return this.subject = new TestEnv();
    });
    describe('model creation', function() {
      it('record with specific id', function() {
        var person;

        person = this.subject.create.call(this, 'person', {
          id: 'john@example.com'
        });
        return runs(function() {
          expect(person.id).toBe('john@example.com');
          expect(person.get('_data.rev')).not.toBeNull();
          return expect(person.get('_data.rev')).not.toBeUndefined();
        });
      });
      it('record with generated id', function() {
        var person;

        person = this.subject.create.call(this, 'person', {});
        return runs(function() {
          return expect(person.id).not.toBeNull();
        });
      });
      it('simple {a:"a", b:"b"} model', function() {
        var person;

        person = this.subject.create.call(this, 'person', {
          a: 'a',
          b: 'b'
        });
        return runs(function() {
          expect(person.get('a')).toBe('a');
          return expect(person.get('b')).toBe('b');
        });
      });
      it('always available as a raw json object', function() {
        var person;

        person = this.subject.create.call(this, 'person', {
          name: 'john'
        });
        return runs(function() {
          return expect(person.get('_data').name).toBe('john');
        });
      });
      it('belongsTo relation', function() {
        var person;

        person = this.subject.create.call(this, 'person', {
          name: 'john'
        });
        return runs(function() {
          var article;

          article = this.subject.create.call(this, 'article', {});
          return runs(function() {
            article.set('person', person);
            article.save();
            waitsFor(function() {
              return article.get('_data.person') !== null;
            });
            return runs(function() {
              return expect(article.get('person.name')).toBe('john');
            });
          });
        });
      });
      it('belongsTo field avilable as a raw js object', function() {
        var person;

        person = this.subject.create.call(this, 'person', {
          name: 'john'
        });
        return runs(function() {
          var message;

          message = this.subject.create.call(this, 'message', {
            person: person
          });
          return runs(function() {
            return expect(message.get('_data.person')).toBe('john');
          });
        });
      });
      return it('with hasMany', function() {
        var article, comment, oldRev;

        comment = this.subject.create.call(this, 'comment', {
          text: 'text'
        });
        article = void 0;
        runs(function() {
          return article = this.subject.create.call(this, 'article', {
            label: 'Label',
            comments: []
          });
        });
        oldRev = void 0;
        runs(function() {
          oldRev = article.get("_data.rev");
          article.set('comments.content', []);
          article.get('comments').pushObject(comment);
          return article.save();
        });
        waitsFor(function() {
          return article.get('_data.rev') !== oldRev;
        }, "", 3000);
        return runs(function() {
          return expect(article.get('_data').comments[0]).toBe(comment.id);
        });
      });
    });
    describe('model updating', function() {
      it('in general', function() {
        var person, prevRev;

        person = this.subject.create.call(this, 'person', {
          name: "John"
        });
        prevRev = void 0;
        runs(function() {
          prevRev = person.get("_data.rev");
          person.set('name', 'Bobby');
          return person.save();
        });
        waitsFor(function() {
          return prevRev !== person.get("_data.rev");
        }, "", 3000);
        return runs(function() {
          return expect(prevRev).not.toEqual(person.get("_data.rev"));
        });
      });
      return it('belongsTo relation', function() {
        var article, name, newName, person1, person2, prevRev;

        name = 'Vpupkin';
        newName = 'Bobby';
        person1 = this.subject.create.call(this, 'person', {
          name: name
        });
        article = void 0;
        prevRev = void 0;
        person2 = void 0;
        runs(function() {
          return article = this.subject.create.call(this, 'article', {
            label: 'Label',
            person: person1
          });
        });
        runs(function() {
          prevRev = article.get("_data.rev");
          return person2 = this.subject.create.call(this, 'person', {
            name: newName
          });
        });
        runs(function() {
          article.set('person', person2);
          return article.save();
        });
        waitsFor(function() {
          return prevRev !== article.get("_data.rev");
        }, "", 3000);
        return runs(function() {
          expect(prevRev).not.toEqual(article.get("_data.rev"));
          return expect(article.get('person')).toEqual(person2.id);
        });
      });
    });
    return describe("deletion", function() {
      return it("in general", function() {
        var person;

        person = this.subject.create.call(this, 'person', {
          name: 'Vpupkin'
        });
        return runs(function() {
          person.deleteRecord();
          person.save();
          return expect(person.get('isDeleted')).toBe(true);
        });
      });
    });
  });

}).call(this);
