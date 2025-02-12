import { FilterQuery, UpdateQuery } from "mongoose";
import SessionModel, { SessionDocument } from "../models/session.model";
import { verifyJwt } from "../utils/jwt.utils";
import { get, omit} from "lodash";
import { findUser } from "./user.service";
import { signJwt } from "../utils/jwt.utils";
import config from 'config';
import { isAdmin } from "./user.service";


export async function createSession(userId: string, userAgent: string) {
  const session = await SessionModel.create({user: userId, userAgent})

  // In this case, .toJSON(); is used to convert the Mongoose document into a plain JavaScript object. It strips away any Mongoose-specific properties or methods, leaving just the raw data from the document.
  return session.toJSON();
}

export async function findSessions(query: FilterQuery<SessionDocument>) {
  // .lean returns plain JavaScript objects instead of Mongoose documents. Similar to .toJSON()
  return SessionModel.find(query).lean();
}

export async function updateSession(query: FilterQuery<SessionDocument>, update: UpdateQuery<SessionDocument>) {
  return SessionModel.updateOne(query, update)
}

export async function deleteSession(query: FilterQuery<SessionDocument>) {
  return SessionModel.deleteOne(query)
}

export async function reIssueAccessToken({refreshToken}:{refreshToken: string}){
  const {decoded} = verifyJwt(refreshToken)

  if (!decoded || !get(decoded, 'session')) return false

  const session = await SessionModel.findById(get(decoded, 'session'))

  if(!session || !session.valid) return false;

  const user = await findUser({_id: session.user})

  if(!user) return false

  const accessToken = signJwt(
    { ...omit(user, "password"), session: session._id, isAdmin: await isAdmin(user)},
    { expiresIn: config.get('accessTokenTtl') } // 15 minutes
  )

  return accessToken;
}