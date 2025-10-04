import { HydratedDocument, SchemaTimestampsConfig } from 'mongoose';
import { Session } from '../schemas/session.schema';

export type SessionDocument = HydratedDocument<Session> & SchemaTimestampsConfig;