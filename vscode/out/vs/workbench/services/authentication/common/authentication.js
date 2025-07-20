import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
/**
 * Use this if you don't want the onDidChangeSessions event to fire in the extension host
 */
export const INTERNAL_AUTH_PROVIDER_PREFIX = '__';
export const IAuthenticationService = createDecorator('IAuthenticationService');
export function isAuthenticationSession(thing) {
    if (typeof thing !== 'object' || !thing) {
        return false;
    }
    const maybe = thing;
    if (typeof maybe.id !== 'string') {
        return false;
    }
    if (typeof maybe.accessToken !== 'string') {
        return false;
    }
    if (typeof maybe.account !== 'object' || !maybe.account) {
        return false;
    }
    if (typeof maybe.account.label !== 'string') {
        return false;
    }
    if (typeof maybe.account.id !== 'string') {
        return false;
    }
    if (!Array.isArray(maybe.scopes)) {
        return false;
    }
    if (maybe.idToken && typeof maybe.idToken !== 'string') {
        return false;
    }
    return true;
}
// TODO: Move this into MainThreadAuthentication
export const IAuthenticationExtensionsService = createDecorator('IAuthenticationExtensionsService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9hdXRoZW50aWNhdGlvbi9jb21tb24vYXV0aGVudGljYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBUUEsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRTdGOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsSUFBSSxDQUFDO0FBOEZsRCxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxlQUFlLENBQXlCLHdCQUF3QixDQUFDLENBQUM7QUFnSXhHLE1BQU0sVUFBVSx1QkFBdUIsQ0FBQyxLQUFjO0lBQ3JELElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDekMsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBQ0QsTUFBTSxLQUFLLEdBQUcsS0FBOEIsQ0FBQztJQUM3QyxJQUFJLE9BQU8sS0FBSyxDQUFDLEVBQUUsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUNsQyxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFDRCxJQUFJLE9BQU8sS0FBSyxDQUFDLFdBQVcsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUMzQyxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFDRCxJQUFJLE9BQU8sS0FBSyxDQUFDLE9BQU8sS0FBSyxRQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDekQsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBQ0QsSUFBSSxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQzdDLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUNELElBQUksT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUMxQyxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztRQUNsQyxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFDRCxJQUFJLEtBQUssQ0FBQyxPQUFPLElBQUksT0FBTyxLQUFLLENBQUMsT0FBTyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ3hELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2IsQ0FBQztBQUVELGdEQUFnRDtBQUNoRCxNQUFNLENBQUMsTUFBTSxnQ0FBZ0MsR0FBRyxlQUFlLENBQW1DLGtDQUFrQyxDQUFDLENBQUMifQ==