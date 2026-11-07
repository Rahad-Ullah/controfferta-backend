type IFolderName = 'image' | 'media' | 'doc';

// Single file
export const getSingleFilePath = (
  files: any,
  folderName: IFolderName
): string | undefined => {
  if (!files) return undefined;

  // Convert/access safely regardless of object prototype
  const fileList = (files as Record<string, any[]>)[folderName];

  if (Array.isArray(fileList) && fileList.length > 0) {
    return fileList[0].location || fileList[0].path;
  }

  return undefined;
};

// Multiple files
export const getMultipleFilesPath = (
  files: any,
  folderName: IFolderName
): string[] | undefined => {
  if (!files) return undefined;

  const fileList = (files as Record<string, any[]>)[folderName];

  if (Array.isArray(fileList) && fileList.length > 0) {
    return fileList.map((file: any) => file.location || file.path);
  }

  return undefined;
};