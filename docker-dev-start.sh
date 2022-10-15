#!/bin/sh

/bin/sleep 10
npx prisma migrate dev
npm run dev -- --legacy-watch --polling-interval=1000