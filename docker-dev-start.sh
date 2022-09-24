#!/bin/sh

npx prisma migrate dev
npm run dev -- --legacy-watch --polling-interval=1000