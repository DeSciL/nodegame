var fs = require('fs');
var path = require('path');
var should = require('should');
var NDDB = require('NDDB').NDDB;

var numPlayers = require('./settings.js').numPlayers;
var numGames;
var filePaths = [];
var dbs = [];
var gameSettings;

// TODO: Assuming two players per game.
if (numPlayers % 2 != 0) {
    console.log('Invalid number of players! Check settings.js.');
    process.exit(1);
}
numGames = numPlayers / 2;

var dataDir = path.resolve(__dirname, '../', 'data/') + '/';

console.log(dataDir);

// Generate memory file pathnames.
for (var i = 0; i < numGames; ++i) {
    filePaths.push(dataDir + (100 + i) + '/memory_all.json');
}

describe('The '+numGames+' memory files "data/*/memory_all.json"', function() {
    it('should exist', function() {
        var gameNo;

        for (gameNo = 0; gameNo < numGames; ++gameNo) {
            fs.existsSync(filePaths[gameNo]).should.be.true;
        }
    });

    it('should be loadable with NDDB', function() {
        var gameNo, db;

        for (gameNo = 0; gameNo < numGames; ++gameNo) {
            db = new NDDB();
            db.loadSync(filePaths[gameNo]);
            db.size().should.be.above(0,
                'Empty DB in game '+(gameNo+1)+'/'+numGames+'!');
            dbs.push(db);
        }
    });
});

describe('File contents', function() {
    before(function() {
        gameSettings = require('../game/game.settings.js');
    });

    it('should have the right number of entries', function() {
        var gameNo, nSets;

        // 2 precache, 2 languageSel, 2 instr, 4 quiz, 4 quest = 14
        // 6 * REPEAT ultimatum 
        nSets = 14 + (6 * gameSettings.REPEAT);

        // TODO: Assuming two players.
        for (gameNo = 0; gameNo < numGames; ++gameNo) {
            dbs[gameNo].size().should.equal(nSets,
                'Wrong number of entries in game '+(gameNo+1)+'/'+numGames+'!');
        }
    });

    it('should have consistent player IDs', function() {
        var gameNo, i;
        var group;

        for (gameNo = 0; gameNo < numGames; ++gameNo) {
            // Assuming two players.
            group = dbs[gameNo].groupBy('player');
            group.length.should.equal(2,
                'Wrong number of players in game '+(gameNo+1)+'/'+numGames+'!');

            // Check for ID data-type.
            for (i = 0; i < 2; ++i) {
                group[i].db[0].player.should.be.String;
            }
        }
    });
});

describe('Bidding rounds', function() {
    var bidDbs = [];

    before(function() {
        for (gameNo = 0; gameNo < numGames; ++gameNo) {
            bidDbs.push(dbs[gameNo].select('stage.stage', '=', 5).breed());
        }
    });

    it('should have the correct number of repetitions', function() {
        for (gameNo = 0; gameNo < numGames; ++gameNo) {
            // Maximum round should equal the repetition number in the settings.
            Math.max.apply(null,
                bidDbs[gameNo].fetchValues('stage.round')['stage.round']
            ).should.equal(gameSettings.REPEAT,
                'Wrong number of rounds in game '+(gameNo+1)+'/'+numGames+'!');
        }
    });

    it('should have valid offers', function() {
        var i, roundDb;
        var offer, response;

        for (gameNo = 0; gameNo < numGames; ++gameNo) {
            for (i = 1; i <= gameSettings.REPEAT; ++i) {
                roundDb = bidDbs[gameNo].select('stage.round', '=', i).breed();

                // Get offer and response.
                offer = roundDb.select('offer').fetch()[0].offer;
                response = roundDb.select('response').fetch()[0];

                // Check value ranges.
                offer.should.be.Number;

                (offer % 1).should.equal(0, 'Offer not an integer in game '+
                    (gameNo+1)+'/'+numGames+'!');

                offer.should.be.within(0, 100, 'Offer not in [0, 100] in game '+
                    (gameNo+1)+'/'+numGames+'!');

                ['ACCEPT', 'REJECT'].should.containEql(response.response,
                    'Invalid response in game '+(gameNo+1)+'/'+numGames+'!');

                // Check offer/response correspondence.
                offer.should.equal(response.value,
                    'Response contains incorrect offer in game '+
                    (gameNo+1)+'/'+numGames+'!');
            }
        }
    });

    it('should have players in the correct roles', function() {
        var i, roundDb;
        var bidderId, respondentId, responseObj;

        for (gameNo = 0; gameNo < numGames; ++gameNo) {
            for (i = 1; i <= gameSettings.REPEAT; ++i) {
                roundDb = bidDbs[gameNo].select('stage.round', '=', i).breed();

                // Check role IDs.
                bidderId = roundDb
                    .select('role', '=', 'BIDDER')
                    .fetch()[0].player;
                respondentId = roundDb
                    .select('role', '=', 'RESPONDENT')
                    .fetch()[0].player;

                bidderId.should.not.equal(respondentId,
                    'Bidder same as respondent in game '+
                    (gameNo+1)+'/'+numGames+'!');

                // Check offer/response correspondence.
                roundDb.select('offer')
                    .fetch()[0].player.should.equal(
                        bidderId, 'Bid did not come from bidder in game '+
                        (gameNo+1)+'/'+numGames+'!');

                responseObj = roundDb.select('response').fetch()[0];
                responseObj.player.should.equal(respondentId,
                    'Response did not come from respondent in game '+
                    (gameNo+1)+'/'+numGames+'!');
                responseObj.from.should.equal(bidderId,
                    'Response contains incorrect bidder ID in game '+
                    (gameNo+1)+'/'+numGames+'!');
            }
        }
    });
});
