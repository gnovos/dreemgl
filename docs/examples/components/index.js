/* DreemGL is a collaboration between Teeming Society & Samsung Electronics, sponsored by Samsung and others.
   Copyright 2015-2016 Teeming Society. Licensed under the Apache License, Version 2.0 (the "License"); You may not use this file except in compliance with the License.
   You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0 Unless required by applicable law or agreed to in writing,
   software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and limitations under the License.*/

define.class('$server/composition', function($$, search, browser) {

    this.render = function() { return [
        search({
            name:'omdb',
            keyword: wire('this.rpc.main.term')
        }),
        browser({
            name:'main',
            term:'Cats',
            movies: wire('this.rpc.omdb.results')
        })
    ] }
});
