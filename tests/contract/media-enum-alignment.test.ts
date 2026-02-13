import {
  MEDIA_PURPOSES as MODEL_MEDIA_PURPOSES,
  STORAGE_PROVIDERS as MODEL_STORAGE_PROVIDERS
} from '@/models/content/MediaAttachment.model';
import {
  MEDIA_PURPOSES as CONTRACT_TYPE_MEDIA_PURPOSES,
  STORAGE_PROVIDERS as CONTRACT_TYPE_STORAGE_PROVIDERS
} from '../../contracts/types/media-types';
import { MediaUploadContracts } from '../../contracts/api/media.contract';

describe('Media Contract Enum Alignment', () => {
  it('keeps media purpose constants aligned between contracts and model', () => {
    expect([...CONTRACT_TYPE_MEDIA_PURPOSES]).toEqual([...MODEL_MEDIA_PURPOSES]);
  });

  it('keeps storage provider constants aligned between contracts and model', () => {
    expect([...CONTRACT_TYPE_STORAGE_PROVIDERS]).toEqual([...MODEL_STORAGE_PROVIDERS]);
  });

  it('exposes the same purpose enum in media upload contract endpoint', () => {
    const purposeEnum = (MediaUploadContracts.requestUploadUrl.request.body.purpose as any)
      .enum as string[];
    expect(purposeEnum).toEqual([...MODEL_MEDIA_PURPOSES]);
  });

  it('documents only runtime-supported storage providers in media upload response', () => {
    const providerSpec = MediaUploadContracts.requestUploadUrl.response.success.body.data
      .provider as string;
    const documentedProviders = providerSpec.split('|');
    expect(documentedProviders).toEqual([...MODEL_STORAGE_PROVIDERS]);
  });
});
