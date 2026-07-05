import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogsService } from './audit-logs.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body } = request;

    // Only audit mutative operations
    const isWrite = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
    if (!isWrite || !user) {
      return next.handle();
    }

    // Skip endpoints that manually log inventory transactions or audits to prevent duplicate entries
    const isInventoryTransactionEndpoint =
      (url.includes('/inventory-requests') &&
        (url.includes('/approve') || url.includes('/reject'))) ||
      (method === 'POST' && url.split('?')[0] === '/central-inventory') ||
      url.includes('/inventory-analytics/redistribution/apply') ||
      url.includes('/audit-logs') ||
      url.includes('/auth/logout');

    // Skip read-only search/query POST endpoints
    const isSearchPost = method === 'POST' && url.split('?')[0] === '/patients';

    if (isInventoryTransactionEndpoint || isSearchPost) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (response) => {
          try {
            this.logAction(method, url, user, body, response);
          } catch (err) {
            console.error('AuditInterceptor failed to log action:', err);
          }
        },
      }),
    );
  }

  private logAction(
    method: string,
    url: string,
    user: any,
    body: any,
    response: any,
  ) {
    // Determine the module and action based on the URL path
    let module = 'general';
    let action = method;
    let message = '';

    const pathParts = url
      .split('?')[0]
      .split('/')
      .filter((p) => p);
    const mainPath = pathParts[0] || '';

    // Map path to a module name
    if (mainPath === 'hospitals') module = 'hospitals';
    else if (mainPath === 'patients') module = 'patients';
    else if (mainPath === 'staff') module = 'staff';
    else if (mainPath === 'medicines') module = 'medicines';
    else if (mainPath === 'inventory-master') module = 'inventory';
    else if (mainPath === 'central-inventory') module = 'inventory';
    else if (mainPath === 'branch-inventory') module = 'inventory';
    else if (mainPath === 'inventory-requests') module = 'inventory';
    else if (mainPath === 'patient-data') module = 'patient-data';
    else if (mainPath === 'diagnostic-tests') module = 'diagnostic-tests';
    else if (mainPath === 'facility-test-availability')
      module = 'diagnostic-tests';

    // Map method to action
    if (method === 'POST') action = 'CREATE';
    else if (method === 'PUT' || method === 'PATCH') action = 'UPDATE';
    else if (method === 'DELETE') action = 'DELETE';

    // Build solid, descriptive messages
    const performer = `${user.username} (${user.role})`;
    const entityId = response?._id || response?.id || pathParts[1] || '';

    switch (module) {
      case 'hospitals':
        if (action === 'CREATE') {
          message = `Hospital "${response?.name || body?.name || 'Unknown'}" was created by ${performer}.`;
        } else if (action === 'UPDATE') {
          message = `Hospital "${response?.name || body?.name || entityId}" was updated by ${performer}.`;
        } else {
          message = `Hospital ID ${entityId} was deleted by ${performer}.`;
        }
        break;

      case 'patients':
        if (action === 'CREATE') {
          message = `Patient "${response?.name || body?.name || 'Unknown'}" was registered by ${performer}.`;
        } else if (action === 'UPDATE') {
          message = `Patient "${response?.name || body?.name || entityId}" was updated by ${performer}.`;
        } else {
          message = `Patient ID ${entityId} was deleted by ${performer}.`;
        }
        break;

      case 'staff':
        if (url.includes('/coverage-requests')) {
          message = `Staff coverage request ID ${entityId} replacement assigned by ${performer}.`;
        } else if (action === 'CREATE') {
          message = `Staff member "${response?.name || body?.name || 'Unknown'}" was added by ${performer}.`;
        } else if (action === 'UPDATE') {
          message = `Staff member "${response?.name || body?.name || entityId}" was updated by ${performer}.`;
        } else {
          message = `Staff member ID ${entityId} was deleted by ${performer}.`;
        }
        break;

      case 'medicines':
        if (action === 'CREATE') {
          message = `Medicine "${response?.name || body?.name || 'Unknown'}" was added to inventory by ${performer}.`;
        } else if (action === 'UPDATE') {
          message = `Medicine "${response?.name || body?.name || entityId}" was updated by ${performer}.`;
        } else {
          message = `Medicine ID ${entityId} was deleted by ${performer}.`;
        }
        break;

      case 'inventory':
        // General inventory modifications (e.g. Master items, manual adjustments)
        if (mainPath === 'inventory-master') {
          if (action === 'CREATE')
            message = `Inventory item "${response?.itemName || body?.itemName || 'Unknown'}" was created by ${performer}.`;
          else if (action === 'UPDATE')
            message = `Inventory item "${response?.itemName || body?.itemName || entityId}" was updated by ${performer}.`;
          else
            message = `Inventory item ID ${entityId} was deleted by ${performer}.`;
        } else if (mainPath === 'branch-inventory' && url.includes('/adjust')) {
          message = `Branch inventory stock adjustment performed by ${performer}.`;
        } else if (mainPath === 'inventory-requests') {
          message = `Inventory request #${response?.requestNumber || 'Unknown'} was created by ${performer}.`;
        } else {
          message = `Inventory change (${action}) performed on ${mainPath} by ${performer}.`;
        }
        break;

      case 'patient-data':
        if (action === 'CREATE') {
          message = `Patient medical record was created for patient ID "${body?.patientId || 'Unknown'}" by ${performer}.`;
        } else if (action === 'UPDATE') {
          message = `Patient medical record ID ${entityId} was updated by ${performer}.`;
        } else {
          message = `Patient medical record ID ${entityId} was deleted by ${performer}.`;
        }
        break;

      case 'diagnostic-tests':
        if (mainPath === 'diagnostic-tests') {
          if (action === 'CREATE') {
            message = `Diagnostic test "${response?.testName || body?.testName || 'Unknown'}" was added to catalog by ${performer}.`;
          } else if (action === 'UPDATE') {
            message = `Diagnostic test "${response?.testName || body?.testName || entityId}" was updated by ${performer}.`;
          } else {
            message = `Diagnostic test ID ${entityId} was deactivated by ${performer}.`;
          }
        } else if (
          mainPath === 'facility-test-availability' &&
          url.includes('/test/')
        ) {
          message = `Test availability was updated at a facility by ${performer}. Status: ${body?.status || 'Unknown'}.`;
        } else {
          message = `Diagnostic test change (${action}) performed by ${performer}.`;
        }
        break;

      default:
        message = `${action} request executed on /${mainPath} by ${performer}.`;
    }

    // Write the audit log entry
    this.auditLogsService.log({
      module,
      action,
      message,
      performedBy: user.username,
      performedByRole: user.role,
      metadata: {
        url,
        requestBody: body,
        responseId: entityId,
      },
    });
  }
}
