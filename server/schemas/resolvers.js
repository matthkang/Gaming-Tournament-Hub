const { Player, Tournament, TournamentPlayers } = require('../models');
const { signToken, AuthenticationError } = require('../utils/auth');

const resolvers = {
    Query: {
        players: async () => {
            return Player.find();
        },
        player: async (parent, { username }) => {
            return Player.findOne({ username });
        },
        userTournaments: async (parent, { username }) => {
            return Player.findOne({ username }).populate('hostedTournaments').populate('joinedTournaments');
        },
        tournament: async (parent, { tournamentId }) => {
            return Tournament.findOne({ _id: tournamentId });
        },
        tournaments: async () => {
            return Tournament.find();
        },
        tournamentPlayers: async (parent, { tournamentId }) => {
            return TournamentPlayers.findOne({ _id: tournamentId });
        },
        me: async (parent, args, context) => {
            if (context.user) {
                return Player.findOne({ _id: context.user._id }).populate('hostedTournaments').populate('joinedTournaments');
            }
            throw AuthenticationError;
        },
    },

    Mutation: {
        addPlayer: async (parent, { username, email, password }) => {
            const player = await Player.create({ username, email, password });
            const token = signToken(player);
            return { token, player };
        },
        login: async (parent, { email, password }) => {
            const player = await Player.findOne({ email });
            if (!player) {
                throw AuthenticationError;
            }
            const correctPw = await player.isCorrectPassword(password);
            if (!correctPw) {
                throw AuthenticationError;
            }
            const token = signToken(player);
            return { token, player };
        },
        addTournament: async (parent, { tournamentName, gameName, playerSize }, context) => {
            if (context.user) {
                console.log("logged in user: ", context.user);
                const tournament = await Tournament.create({
                    tournName: tournamentName,
                    gameName: gameName,
                    playerSize,
                });
                console.log("created tourn: ", tournament);

                // update player's hostedTournaments
                const player = await Player.findOneAndUpdate(
                    { _id: context.user._id },
                    { $addToSet: { hostedTournaments: tournament._id } }
                )
                console.log("adding to player: ", player);

                // update tournament's host
                const tournamentPlayers = await TournamentPlayers.create({
                    _id: tournament._id,
                    tournamentHost: context.user._id,
                });
                console.log("adding to tournament: ", tournamentPlayers);

                return tournament;
            }
            throw AuthenticationError;
        },
        removeTournament: async (parent, { tournamentId }, context) => {
            if (context.user) {
                const tournament = await Tournament.findOneAndDelete({
                    _id: tournamentId,
                    tournamentHost: context.user.username,
                });

                await Player.findOneAndUpdate(
                    { _id: context.user._id },
                    { $pull: { tournaments: tournament._id } },
                    { new: true }
                );

                return tournament;
            }
            throw AuthenticationError;
        },

    }
}

module.exports = resolvers;

