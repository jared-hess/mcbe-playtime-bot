# Description
A discord bot for displaying user playtime for mcbe bds servers. It will pull connect and disconnect messages from a defined channel and calculate how much time users spend logged into the server. This data can be accessed with discord commands that output charts. Currently the log formats assume use of the default MCscripts configuration but this could be made configurable in the future. 
This project should be considered to be in very early alpha stages.

# Notes
I've included a docker-compose file to manage dependencies (mongodb and redis), though it could be run without docker if you install these locally. 

# Setup
* Install docker
* Create a new project and bot on the discord developer portal
* Copy the bot token and oath client id and save these somewhere
* Clone this repo
* Copy env.template to .env
* Fill out .env
  * DISCORD_TOKEN is the bot token from earlier
  * SERVER_NAME is the name of the server you will be adding the bot to
  * WATCH_CHANNEL is the name of the channel the bot will listen to for connect/disconnect messages
  * COMMAND_CHANNEL is the name of the channel the bot will listen to for commands
* Add the bot to the server (only add the bot to a single server, we can't support more than one server yet)
  * Use this link to add the bot to the server: `https://discord.com/oauth2/authorize?client_id=<your_oath_client_id_here>&scope=bot`
* Ensure that the bot has permissions to read from the watch channel and can read and send to the command channel (this will vary based on your role configuration)
* Start the bot 
  * `docker-compose up --build`
* If there are already a lot of messages in the watch channel it may take a few minutes for the bot to process everything at first. This will be faster on subsequent startups.

# Commands
## `!playtimeleaders` 
  This command will display the leader-board and show everyone's playtime over a specific period of time (default is 30 days). It can accept 1 parameter (the number of days).
Example:

`!playtimeleaders`

`!playtimeleaders 15`
## `!playtime`
This command will display the daily playtime for a particular user by day. It requires 1 parameter (the gamertag) and a second optional parameter can be provided (the number of days). Gamertags with spaces mush be surrounded by quotes. Capitalization must also match your gamertag.
Example:

`!playtime telepath0gen`

`!playtime "Gamertag with spaces" 15`
# Caveats
* Commands MUST be entered in #bot-commands. They won't work anywhere else.
* All times are GMT, which likely won't match your timezone. It's kind of annoying, but I don't know of a way to localize it to each user so using GMT makes sense to standardize on.
* Currently session times are considered to count toward the day when the login happened, so it might skew results a bit for sessions that span more than one day.

# Design
We use quickchart for building the charts.

We use Mongodb to store the sessions and Bull (redis backed queue) to queue incoming messages to ensure they are processed in the correct order. Both of these are probably overkill but they both solve certain problems:
* Mongodb - Storing the data persistently keeps us from having to refetch and recalculate old sessions. This saves on time, and keeps our bot token from getting rate limited for too many discord API requests. Mongo also offers a lot of features that make it relatively easy to generate the charts.
* Bull - This was added almost exclusively to solve the issue of incoming messages during the initial bulk parse of existing messages during bot startup. Since it can take several minutes to fetch and parse content of the watched channel on initialization, it's entirely possible that we would receive a connect/disconnect message during that time, which could cause major issues if that message is parsed before the historical data. Bull gives us a priority queue and allows us to pause message processing until all data has been added to the queue.
