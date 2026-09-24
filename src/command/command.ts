export abstract class Command {
  abstract run(): void;
  abstract undo(): void;
};