#!/bin/bash

directory="app"

if [ ! -d "$directory" ]; then
  mkdir "$directory"
fi

cd "$directory" || exit 1

if [ ! -d "$directory" ]; then
  git clone https://github.com/overseer-discord/overseer-music.git "$directory"
else
  git pull origin main
fi

cd overseer-music
npm i -g pm2

echo 'Deployment successful to Ubuntu server'