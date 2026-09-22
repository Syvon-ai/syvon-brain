import { describe, it, expect } from 'vitest';
import {
  POSTS_DIR, getPostFolder, getPostFilePath, getPostKey,
  POST_MEDIA_STEM, POST_POSTER_FILENAME, POST_DESCRIPTOR_FILENAME,
  postPageFilename, isPostKey,
} from '../dna/post-paths';

describe('post-paths', () => {
  it('folders a post under posts/{slug}', () => {
    expect(POSTS_DIR).toBe('posts');
    expect(getPostFolder('womens-swim')).toBe('posts/womens-swim');
  });

  it('builds workspace-relative file paths', () => {
    expect(getPostFilePath('womens-swim', 'media.mp4')).toBe('posts/womens-swim/media.mp4');
    expect(getPostFilePath('womens-swim', POST_POSTER_FILENAME)).toBe('posts/womens-swim/poster.jpg');
    expect(getPostFilePath('womens-swim', POST_DESCRIPTOR_FILENAME)).toBe('posts/womens-swim/post.json');
  });

  it('numbers carousel pages from 1', () => {
    expect(postPageFilename(1, 'png')).toBe('1.png');
    expect(postPageFilename(12, 'jpg')).toBe('12.jpg');
  });

  it('getPostKey is BUCKET-ABSOLUTE and prefix-tolerant', () => {
    expect(getPostKey('workspaces/ws1/', 'a', 'media.mp4')).toBe('workspaces/ws1/posts/a/media.mp4');
    expect(getPostKey('workspaces/ws1',  'a', 'media.mp4')).toBe('workspaces/ws1/posts/a/media.mp4');
  });

  it('recognises a posts key in either shape', () => {
    expect(isPostKey('posts/a/media.mp4')).toBe(true);
    expect(isPostKey('workspaces/ws1/posts/a/media.mp4')).toBe(true);
    expect(isPostKey('projects/p/output/a.mp4')).toBe(false);
  });

  it('POST_MEDIA_STEM is the primary playable/still stem', () => {
    expect(POST_MEDIA_STEM).toBe('media');
  });
});
