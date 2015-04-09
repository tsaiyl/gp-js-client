/*	
 * Copyright IBM Corp. 2015
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Low Level test of GAAS API

var projectId = process.env.GAAS_PROJECT  || 'MyLLProject'+Math.random();
var projectId2 = process.env.GAAS_PROJECT2 || 'MyOtherLLProject'+Math.random();
var apiKey = process.env.GAAS_API_KEY;
var url = process.env.GAAS_API_URL;
var vcapEnv = process.env.VCAP_SERVICES;
var CLEANSLATE = false; // CLEANSLATE: assume no other projects
var VERBOSE = process.env.GAAS_VERBOSE || false;

if(VERBOSE) console.dir(module.filename);

function removeTrailing(str, chr) {
    if (!str || (str=="")) return str;
    if (str[str.length-1] == chr) {
        return str.substring(0, str.length-1);
    } else {
        return str;
    }
};

url = removeTrailing(url, '/'); // strip trailing slash

var expect = require('chai').expect;

var assert = require('assert');

var gaasLib = require('../index.js');
var gaas = new gaasLib.Client({ vcap: vcapEnv, url: url, api: apiKey, project: projectId });

var sourceLoc = "en-US";
var targLoc = "zh-Hans";

var sourceData = {
    "key1": "First string to translate",
    "key2": "Second string to translate"
};

if ( ! url ) {
  url = gaas._getUrl(); // fetch the URL from vcap, etc
}

var http_or_https;
if ( url.indexOf('https') === 0) {
    http_or_https = require('https');
} else { 
    http_or_https = require('http');
}

describe('Check URL ' + url+'/', function() {
    it('Should let me fetch landing page', function(done) {
        http_or_https.get(url+'/', // trailing slash to avoid 302
                          function(d) {
                            if(VERBOSE) console.log('-> ' + d.statusCode); // dontcare
                             done();
                          })
        .on('error', done);
    });
});

describe('cleaning up', function() {
    it('Cleanup: Should delete '+projectId+' (ignoring errs)', function(done) {
        try {
            gaas.rest_deleteProject({ projectID: projectId }, function good(resp) {
                done();
            }, function() {done();} );
        } catch (e) { done(); }
    });
    it('Cleanup: Should delete '+projectId2+' (ignoring errs)', function(done) {
        try {
            gaas.rest_deleteProject({ projectID: projectId2 }, function good(resp) {
                done();
            }, function() {done();} );
        } catch (e) { done(); }
    });
});

/**
 * probably been written before!
 */
function arrayToHash(o, k) {
  var res = {};
  if(o) {
    for(var i in o) {
      res[o[i][k]] = o[i];
    }
  }
  return res;
}

describe('gaas-client', function() {
    describe('getInfo', function() {
        it('should contain English', function(done) {
            gaas.rest_getInfo({}, function good(resp) {
                expect(resp.status).to.equal('success');
                expect(resp.supportedTranslation).to.include.keys('en');
                done();
            }, done);
        });
    });
    describe('getProjectList', function() {
        it('should not include ' + projectId + ' or ' + projectId2, function(done) {
            gaas.rest_getProjectList({}, function good(resp) {
              expect(resp.status).to.equal('success');
              expect(resp.projects).to.not.include(projectId);
              expect(resp.projects).to.not.include(projectId2);
              if(CLEANSLATE) expect(resp.projects).to.be.empty();
              done();
            }, done);
        });
    });

    describe('createProject(MyProject)', function() {
        it('should let us create', function(done) {
            gaas.rest_createProject({ body: {id: projectId, sourceLanguage: 'en', targetLanguages: ['es','qru']}}, function good(resp) {
                expect(resp.status).to.equal('success');
                done();
            }, done);
        });
    });

    describe('updateResourceData(en)', function() {
        it('should let us update some data', function(done) {
            gaas.rest_updateResourceData({projectID: projectId, languageID: 'en',
                                     body: { data: sourceData, replace: false }},
                                    function good(resp) {
                                        expect(resp.status).to.be.equal('success');
                                        done();
                                    }, done);
        });
    });

    describe('getProjectList [expect: MyProject]', function() {
        it('should return our project in the list', function(done) {
            gaas.rest_getProjectList({}, function good(resp) {
                expect(resp.status).to.equal('success');
                if(CLEANSLATE) expect(resp.projects.length).to.equal(1);
                var projs = arrayToHash(resp.projects, 'id');
                expect(projs).to.contain.keys(projectId);
                expect(resp.projects[0].sourceLanguage).to.equal('en');
                expect(projs[projectId].targetLanguages).to.include('es');
                expect(projs[projectId].targetLanguages).to.include('qru');
                expect(projs[projectId].targetLanguages).to.not.include('de');
                expect(projs[projectId].targetLanguages).to.not.include('zh-Hans');
                done();
            }, done);
        });
    });

    describe('createProject', function() {
        it('should let us create another', function(done) {
            gaas.rest_createProject({ body: {id: projectId2, sourceLanguage: 'en', targetLanguages: ['de','zh-Hans']}}, function good(resp) {
                expect(resp.status).to.equal('success');
                done();
            }, done);
        });
    });

    describe('getProjectList', function() {
        it('should return our other project in the list', function(done) {
            gaas.rest_getProjectList({}, function good(resp) {
                expect(resp.status).to.equal('success');
                var projs = arrayToHash(resp.projects, 'id');
                expect(projs).to.include.keys(projectId);
                expect(projs[projectId].targetLanguages).to.include('es');
                expect(projs[projectId].targetLanguages).to.include('qru');
                expect(projs[projectId].targetLanguages).to.not.include('de');
                expect(projs[projectId].targetLanguages).to.not.include('zh-Hans');
                expect(projs).to.include.keys(projectId2);
                expect(projs[projectId2].targetLanguages).to.include('de');
                expect(projs[projectId2].targetLanguages).to.include('zh-Hans');
                expect(projs[projectId2].targetLanguages).to.not.include('es');
                expect(projs[projectId2].targetLanguages).to.not.include('qru');
                if(CLEANSLATE) expect(resp.projects.length).to.equal(2);
                done();
            }, done);
        });
    });

    describe('getProject(MyOtherProject)', function() {
        it('should let us query our 2nd project', function(done) {
            gaas.rest_getProject({ projectID: projectId2 }, function good(resp) {
                expect(resp.status).to.equal('success');
                expect(resp.project.targetLanguages).to.include('de');
                expect(resp.project.targetLanguages).to.include('zh-Hans');
                expect(resp.project.targetLanguages).to.not.include('es');
                expect(resp.project.targetLanguages).to.not.include('qru');
                expect(resp.project.targetLanguages).to.not.include('it');
                 done();
            }, done);
        });
    });

    describe('updateProject(MyOtherProject) +it', function() {
        it('should let us change the target languages', function(done) {
            gaas.rest_updateProject({ projectID: projectId2, 
                                 body: { newTargetLanguages: ["it"] }},
                               function good(resp) {
                                   expect(resp.status).to.equal('success');
                                   done();
                               }, done);
            });
    });

    describe('getProject(MyOtherProject)', function() {
        it('should let us query our 2nd project again', function(done) {
            gaas.rest_getProject({ projectID: projectId2 }, function good(resp) {
                expect(resp.status).to.equal('success');
                expect(resp.project.targetLanguages).to.include('de');
                expect(resp.project.targetLanguages).to.include('it');
                expect(resp.project.targetLanguages).to.include('zh-Hans');
                expect(resp.project.targetLanguages).to.not.include('es');
                expect(resp.project.targetLanguages).to.not.include('qru');
                done();
            }, done);
        });
    });

    describe('deleteLangauge(MyOtherProject) -de', function() {
        it('should let us delete German from 2nd project', function(done) {
            gaas.rest_deleteLanguage({ projectID: projectId2, languageID: 'de' }, function good(resp) {
                expect(resp.status).to.equal('success');
                done();
            }, done);
        });
    });

    describe('getProject(MyOtherProject)', function() {
        it('should let us query our 2nd project yet again', function(done) {
            gaas.rest_getProject({ projectID: projectId2 }, function good(resp) {
                expect(resp.status).to.equal('success');
                expect(resp.project.targetLanguages).to.not.include('de');
                expect(resp.project.targetLanguages).to.include('it');
                expect(resp.project.targetLanguages).to.include('zh-Hans');
                expect(resp.project.targetLanguages).to.not.include('es');
                expect(resp.project.targetLanguages).to.not.include('qru');
                done();
            }, done);
        });
    });

    describe('updateProject(MyOtherProject) +de', function() {
        it('should let us change the target languages', function(done) {
            gaas.rest_updateProject({ projectID: projectId2, 
                                 body: { newTargetLanguages: ["de"] }},
                               function good(resp) {
                                   expect(resp.status).to.equal('success');
                                   done();
                               }, done);
            });
    });

    describe('getProject(MyOtherProject)', function() {
        it('should let us query our 2nd project again again', function(done) {
            gaas.rest_getProject({ projectID: projectId2 }, function good(resp) {
                expect(resp.status).to.equal('success');
                expect(resp.project.targetLanguages).to.include('de');
                expect(resp.project.targetLanguages).to.include('it');
                expect(resp.project.targetLanguages).to.include('zh-Hans');
                expect(resp.project.targetLanguages).to.not.include('es');
                expect(resp.project.targetLanguages).to.not.include('qru');
                done();
            }, done);
        });
    });

    describe('getProject(nonExist)', function() {
        it('should NOT let us query a non-existent project', function(done) {
            gaas.rest_getProject({ projectID: 'MyBadProject' }, function good(resp) {
                expect(resp.status).to.not.equal('success');
                done('Should not have worked');
            }, function(x){done();});
        });
    });

    describe('deleteProject', function() {
        it('should let us delete', function(done) {
            gaas.rest_deleteProject({ projectID: projectId2 }, function good(resp) {
                expect(resp.status).to.equal('success');
                done();
            }, done);
        });
    });

    describe('getProjectList', function() {
        it('should return our project in the list', function(done) {
            gaas.rest_getProjectList({}, function good(resp) {
                expect(resp.status).to.equal('success');
                if(CLEANSLATE) expect(resp.projects.length).to.equal(1);
                if(CLEANSLATE) expect(resp.projects[0].id).to.equal(projectId);
                var projs = arrayToHash(resp.projects, 'id');
                expect(projs).to.include.keys(projectId);
                done();
            }, done);
        });
    });

    describe('getResourceData(en)', function() {
        it('should return our resource data for English', function(done) {
            gaas.rest_getResourceData({ projectID: projectId, languageID: 'en'}, function good(resp) {
              if(VERBOSE) console.dir(resp);
                expect(resp.status).to.equal('success');
                //expect(resp.resourceData.translationStatus).to.equal('sourceLanguage');
                expect(resp.resourceData.language).to.equal('en');
                done();
            }, done);
        });
    });

    describe('getResourceEntry(en)', function() {
        it('should return our resource data for English', function(done) {
            gaas.rest_getResourceEntry({ projectID: projectId, languageID: 'en', resKey: 'key1'}, function good(resp) {
              if(VERBOSE) console.dir(resp);
                expect(resp.status).to.equal('success');
                expect(resp.resourceEntry.translationStatus).to.equal('sourceLanguage');
                expect(resp.resourceEntry.language).to.equal('en');
                expect(resp.resourceEntry.key).to.equal('key1');
                expect(resp.resourceEntry.value).to.equal(sourceData['key1']);
                done();
            }, done);
        });
    });

    describe('getResourceData(fr)', function() {
        it('should return our resource data for French', function(done) {
            gaas.rest_getResourceData({ projectID: projectId, languageID: 'qru'}, function good(resp) {
              if(VERBOSE) console.dir(resp);
                expect(resp.status).to.equal('success');
//                expect(resp.resourceData.translationStatus).to.equal('completed');
                expect(resp.resourceData.language).to.equal('qru');
                done();
            }, done);
        });
    });

    describe('deleteProject', function() {
        it('should let us deleted', function(done) {
            gaas.rest_deleteProject({ projectID: projectId }, function good(resp) {
                expect(resp.status).to.equal('success');
                done();
            }, done);
        });
    });

    describe('getResourceData(en)', function() {
        it('should NOT return our resource data for our deleted project', function(done) {
            gaas.rest_getResourceData({ projectID: projectId, languageID: 'en'}, function good(resp) {
              if(VERBOSE) console.dir(resp);
                expect(resp.status).to.not.equal('success');
                done();
            }, function(x) {
                if(x.obj) {
                  if(VERBOSE) console.dir(x.obj);
                }
                done(); // failed, as expected
            });
        });
    });

    describe('getProjectList', function() {
        it('should return an smaller list again', function(done) {
            gaas.rest_getProjectList({}, function good(resp) {
              expect(resp.status).to.equal('success');
              if(CLEANSLATE) expect(resp.projects).to.be.empty();
              var projs = arrayToHash(resp.projects, 'id');
              expect(resp.projects).to.not.include.keys(projectId);
              expect(resp.projects).to.not.include.keys(projectId2);
              done();
            }, done);
        });
    });
});