import 'dotenv/config';
import { DataAPIClient } from '@datastax/astra-db-ts';

const client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN);
export const db = client.db(process.env.ASTRA_DB_API_ENDPOINT);

export const col = {
  users:          () => db.collection('users'),
  relationships:  () => db.collection('relationships'),
  exercises:      () => db.collection('exercises'),
  programs:       () => db.collection('programs'),
  programDays:    () => db.collection('program_days'),
  assignments:    () => db.collection('assignments'),
  sessions:       () => db.collection('sessions'),
  sets:           () => db.collection('sets'),
  prs:            () => db.collection('personal_records'),
};
