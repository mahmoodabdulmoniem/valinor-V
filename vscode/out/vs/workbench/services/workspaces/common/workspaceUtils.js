export async function areWorkspaceFoldersEmpty(workspace, fileService) {
    for (const folder of workspace.folders) {
        const folderStat = await fileService.resolve(folder.uri);
        if (folderStat.children && folderStat.children.length > 0) {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3Jrc3BhY2VzL2NvbW1vbi93b3Jrc3BhY2VVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFPQSxNQUFNLENBQUMsS0FBSyxVQUFVLHdCQUF3QixDQUFDLFNBQXFCLEVBQUUsV0FBeUI7SUFDOUYsS0FBSyxNQUFNLE1BQU0sSUFBSSxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDeEMsTUFBTSxVQUFVLEdBQUcsTUFBTSxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN6RCxJQUFJLFVBQVUsQ0FBQyxRQUFRLElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDM0QsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2IsQ0FBQyJ9