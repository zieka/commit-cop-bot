import { toLambda } from 'probot-serverless-now';
import app from './src/index';
module.exports = toLambda(app as any);
