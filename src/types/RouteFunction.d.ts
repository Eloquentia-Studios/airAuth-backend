import type { NextFunction, Request, Response } from 'express'

type RouteFunction = (req: Request, res: Response, next?: NextFunction) => void
export default RouteFunction
