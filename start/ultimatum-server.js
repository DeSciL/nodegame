/**
 * # Launcher file for nodeGame Server
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Starts two channels, one to test the requirements,
 * and one to actually play an Ultimatum game.
 *
 * http://www.nodegame.org
 * ---
 */

// Load the Node.js path object.
var path = require('path');

// Load the ServerNode class.
var ServerNode = require('nodegame-server').ServerNode;

// Load the Node.js fs module for reading files.
var fs = require('fs');

// Overrides some of the default options for ServerNode.
var options = {
    // Additional conf directory.
    confDir: './conf',
    // logDir: './log', // not working at the moment
    servernode: function(servernode) {
        // Special configuration for the ServerNode object.

        // Adds a new game directory (Default is nodegame-server/games).
        servernode.gamesDirs.push('./games');
        // Sets the debug mode, exceptions will be thrown (Default is false).
        servernode.debug = true;

        return true;
    },
    http: function(http,serverNode) {
        // Special configuration for Express goes here.
        return true;
    },
    sio: function(sio) {
        // Special configuration for Socket.Io goes here here.

        // sio.set('transports', [
        //   'websocket'
        // , 'flashsocket'
        // , 'htmlfile'
        // , 'xhr-polling'
        // , 'jsonp-polling'
        // ]);

        return true;
    },
    languages: [
                {
                    name: 'English',
                    nativeName: 'English',
                    shortName: 'en',
                    flag: ''
                },
                {
                    name: 'German',
                    nativeName: 'Deutsch',
                    shortName: 'de',
                    flag: ''
                },
                {
                    name: 'French',
                    nativeName: 'Français',
                    shortName: 'fr',
                    flag: ''
                }
    ]
};

// Start server, options parameter is optional.
var sn = new ServerNode(options);

sn.ready(function() {
    var i = 0;
    var pageNames = [];


    // Get the absolute path to the game directory.
    var ultimatumPath = sn.resolveGameDir('ultimatum');
    if (!ultimatumPath) {
        throw new Error('Ultimatum game not found.');
    }

    // Add the game channel.
    var ultimatum = sn.addChannel({
        name: 'ultimatum',
        admin: 'ultimatum/admin',
        player: 'ultimatum',
        verbosity: 100,
        // If TRUE, players can invoke GET commands on admins.
        getFromAdmins: true,
        // Unauthorized clients will be redirected here.
        // (defaults: "/pages/accessdenied.htm")
        accessDeniedUrl: '/ultimatum/unauth.htm'
    });

    // Creates the room that will spawn the games for the channel.
    var gameRoom = ultimatum.createWaitingRoom({
        logicPath:  ultimatumPath + 'server/game.room.js',
        name: 'waitRoom'
    });

    // Add a requirements-check / feedback channel.
    var requirements = sn.addChannel({
        name: 'requirements',
        admin: 'requirements/admin',
        player: 'requirements',
        verbosity: 100,
        // If TRUE, players can invoke GET commands on admins.
        getFromAdmins: true
    });

    // Creates the waiting room for the channel.
    var reqRoom = requirements.createWaitingRoom({
        logicPath: ultimatumPath + 'server/requirements.room.js',
        name: 'requirementsWR'
    });

    pageNames = ['bidder', 'ended', 'instructions', 'instructions_pp',
        'postgame', 'pregame', 'quiz', 'resp', 'solo', 'ultimatum'];
});

// Exports the whole ServerNode.
module.exports = sn;
