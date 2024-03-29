import { ObservableInput } from 'rxjs';

export type TaskFactory<T = any> = () => ObservableInput<T>;

export interface RendererContext {
  readonly slug: string;
  readonly fetchExternalImage: (req: { url: string; localPath: string }) => void;
}

export type PostAttributes = {
  readonly title: string;
  readonly published: boolean;
  readonly published_at: string;
  readonly topics: string[];
  readonly type: 'tech' | 'idea';
  readonly emoji: string;
  readonly source: string;
};
