DROP FUNCTION IF EXISTS _rename_column_if_exists(text, text, text);

CREATE OR REPLACE FUNCTION _rename_column_if_exists(target_table_name text, old_column_name text, new_column_name text)
RETURNS void AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND columns.table_name = target_table_name
      AND column_name = old_column_name
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND columns.table_name = target_table_name
      AND column_name = new_column_name
  ) THEN
    EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', target_table_name, old_column_name, new_column_name);
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT _rename_column_if_exists('users', 'clientCompanyId', 'client_company_id');
SELECT _rename_column_if_exists('users', 'isActive', 'is_active');
SELECT _rename_column_if_exists('users', 'deletedAt', 'deleted_at');
SELECT _rename_column_if_exists('users', 'createdAt', 'created_at');
SELECT _rename_column_if_exists('users', 'updatedAt', 'updated_at');

SELECT _rename_column_if_exists('client_companies', 'isActive', 'is_active');
SELECT _rename_column_if_exists('client_companies', 'createdAt', 'created_at');
SELECT _rename_column_if_exists('client_companies', 'updatedAt', 'updated_at');

SELECT _rename_column_if_exists('dental_labs', 'clientCompanyId', 'client_company_id');
SELECT _rename_column_if_exists('dental_labs', 'isActive', 'is_active');
SELECT _rename_column_if_exists('dental_labs', 'createdAt', 'created_at');
SELECT _rename_column_if_exists('dental_labs', 'updatedAt', 'updated_at');

SELECT _rename_column_if_exists('lab_customers', 'dentalLabId', 'dental_lab_id');
SELECT _rename_column_if_exists('lab_customers', 'isActive', 'is_active');
SELECT _rename_column_if_exists('lab_customers', 'deletedAt', 'deleted_at');
SELECT _rename_column_if_exists('lab_customers', 'createdAt', 'created_at');
SELECT _rename_column_if_exists('lab_customers', 'updatedAt', 'updated_at');

SELECT _rename_column_if_exists('user_lab_memberships', 'userId', 'user_id');
SELECT _rename_column_if_exists('user_lab_memberships', 'dentalLabId', 'dental_lab_id');
SELECT _rename_column_if_exists('user_lab_memberships', 'createdAt', 'created_at');

SELECT _rename_column_if_exists('service_types', 'dentalLabId', 'dental_lab_id');
SELECT _rename_column_if_exists('service_types', 'isActive', 'is_active');
SELECT _rename_column_if_exists('service_types', 'deletedAt', 'deleted_at');
SELECT _rename_column_if_exists('service_types', 'workflowJson', 'workflow_json');
SELECT _rename_column_if_exists('service_types', 'createdAt', 'created_at');
SELECT _rename_column_if_exists('service_types', 'updatedAt', 'updated_at');

SELECT _rename_column_if_exists('processes', 'dentalLabId', 'dental_lab_id');
SELECT _rename_column_if_exists('processes', 'isActive', 'is_active');
SELECT _rename_column_if_exists('processes', 'deletedAt', 'deleted_at');
SELECT _rename_column_if_exists('processes', 'createdAt', 'created_at');
SELECT _rename_column_if_exists('processes', 'updatedAt', 'updated_at');

SELECT _rename_column_if_exists('milling_drills', 'dentalLabId', 'dental_lab_id');
SELECT _rename_column_if_exists('milling_drills', 'serialNumber', 'serial_number');
SELECT _rename_column_if_exists('milling_drills', 'maxTeethRecommended', 'max_teeth_recommended');
SELECT _rename_column_if_exists('milling_drills', 'installedAt', 'installed_at');
SELECT _rename_column_if_exists('milling_drills', 'changedAt', 'changed_at');
SELECT _rename_column_if_exists('milling_drills', 'isActive', 'is_active');
SELECT _rename_column_if_exists('milling_drills', 'deletedAt', 'deleted_at');
SELECT _rename_column_if_exists('milling_drills', 'createdAt', 'created_at');
SELECT _rename_column_if_exists('milling_drills', 'updatedAt', 'updated_at');

SELECT _rename_column_if_exists('case_millings', 'dentalLabId', 'dental_lab_id');
SELECT _rename_column_if_exists('case_millings', 'caseId', 'case_id');
SELECT _rename_column_if_exists('case_millings', 'blockTypeId', 'block_type_id');
SELECT _rename_column_if_exists('case_millings', 'millingDrillId', 'milling_drill_id');
SELECT _rename_column_if_exists('case_millings', 'fineMillingDrillId', 'fine_milling_drill_id');
SELECT _rename_column_if_exists('case_millings', 'coarseMillingDrillId', 'coarse_milling_drill_id');
SELECT _rename_column_if_exists('case_millings', 'redoneFromMillingId', 'redone_from_milling_id');
SELECT _rename_column_if_exists('case_millings', 'teethMilledQty', 'teeth_milled_qty');
SELECT _rename_column_if_exists('case_millings', 'failureReason', 'failure_reason');
SELECT _rename_column_if_exists('case_millings', 'milledAt', 'milled_at');
SELECT _rename_column_if_exists('case_millings', 'createdAt', 'created_at');
SELECT _rename_column_if_exists('case_millings', 'updatedAt', 'updated_at');

SELECT _rename_column_if_exists('case_attachments', 'caseId', 'case_id');
SELECT _rename_column_if_exists('case_attachments', 'fileName', 'file_name');
SELECT _rename_column_if_exists('case_attachments', 'filePath', 'file_path');
SELECT _rename_column_if_exists('case_attachments', 'fileType', 'file_type');
SELECT _rename_column_if_exists('case_attachments', 'fileSize', 'file_size');
SELECT _rename_column_if_exists('case_attachments', 'retentionUntil', 'retention_until');
SELECT _rename_column_if_exists('case_attachments', 'archivedAt', 'archived_at');
SELECT _rename_column_if_exists('case_attachments', 'uploadedById', 'uploaded_by_id');
SELECT _rename_column_if_exists('case_attachments', 'createdAt', 'created_at');

SELECT _rename_column_if_exists('clinics', 'dentalLabId', 'dental_lab_id');
SELECT _rename_column_if_exists('clinics', 'labCustomerId', 'lab_customer_id');
SELECT _rename_column_if_exists('clinics', 'isActive', 'is_active');
SELECT _rename_column_if_exists('clinics', 'deletedAt', 'deleted_at');
SELECT _rename_column_if_exists('clinics', 'createdAt', 'created_at');
SELECT _rename_column_if_exists('clinics', 'updatedAt', 'updated_at');

SELECT _rename_column_if_exists('dentists', 'dentalLabId', 'dental_lab_id');
SELECT _rename_column_if_exists('dentists', 'clinicId', 'clinic_id');
SELECT _rename_column_if_exists('dentists', 'isActive', 'is_active');
SELECT _rename_column_if_exists('dentists', 'deletedAt', 'deleted_at');
SELECT _rename_column_if_exists('dentists', 'createdAt', 'created_at');
SELECT _rename_column_if_exists('dentists', 'updatedAt', 'updated_at');

SELECT _rename_column_if_exists('components', 'dentalLabId', 'dental_lab_id');
SELECT _rename_column_if_exists('components', 'defaultCost', 'default_cost');
SELECT _rename_column_if_exists('components', 'defaultPrice', 'default_price');
SELECT _rename_column_if_exists('components', 'isActive', 'is_active');
SELECT _rename_column_if_exists('components', 'deletedAt', 'deleted_at');
SELECT _rename_column_if_exists('components', 'createdAt', 'created_at');
SELECT _rename_column_if_exists('components', 'updatedAt', 'updated_at');

SELECT _rename_column_if_exists('case_component_usages', 'caseId', 'case_id');
SELECT _rename_column_if_exists('case_component_usages', 'componentId', 'component_id');
SELECT _rename_column_if_exists('case_component_usages', 'chargeClient', 'charge_client');
SELECT _rename_column_if_exists('case_component_usages', 'unitCost', 'unit_cost');
SELECT _rename_column_if_exists('case_component_usages', 'unitPrice', 'unit_price');
SELECT _rename_column_if_exists('case_component_usages', 'createdAt', 'created_at');
SELECT _rename_column_if_exists('case_component_usages', 'updatedAt', 'updated_at');

SELECT _rename_column_if_exists('block_types', 'dentalLabId', 'dental_lab_id');
SELECT _rename_column_if_exists('block_types', 'defaultCost', 'default_cost');
SELECT _rename_column_if_exists('block_types', 'isActive', 'is_active');
SELECT _rename_column_if_exists('block_types', 'deletedAt', 'deleted_at');
SELECT _rename_column_if_exists('block_types', 'createdAt', 'created_at');
SELECT _rename_column_if_exists('block_types', 'updatedAt', 'updated_at');

SELECT _rename_column_if_exists('cases', 'dentalLabId', 'dental_lab_id');
SELECT _rename_column_if_exists('cases', 'patientName', 'patient_name');
SELECT _rename_column_if_exists('cases', 'clinicId', 'clinic_id');
SELECT _rename_column_if_exists('cases', 'serviceTypeId', 'service_type_id');
SELECT _rename_column_if_exists('cases', 'dentistId', 'dentist_id');
SELECT _rename_column_if_exists('cases', 'cadDesignerId', 'cad_designer_id');
SELECT _rename_column_if_exists('cases', 'createdByUserId', 'created_by_user_id');
SELECT _rename_column_if_exists('cases', 'currentStatus', 'current_status');
SELECT _rename_column_if_exists('cases', 'elementsQty', 'elements_qty');
SELECT _rename_column_if_exists('cases', 'dueDate', 'due_date');
SELECT _rename_column_if_exists('cases', 'isUrgent', 'is_urgent');
SELECT _rename_column_if_exists('cases', 'pendingNote', 'pending_note');
SELECT _rename_column_if_exists('cases', 'createdAt', 'created_at');
SELECT _rename_column_if_exists('cases', 'updatedAt', 'updated_at');

SELECT _rename_column_if_exists('case_processes', 'caseId', 'case_id');
SELECT _rename_column_if_exists('case_processes', 'processId', 'process_id');
SELECT _rename_column_if_exists('case_processes', 'workflowStepId', 'workflow_step_id');
SELECT _rename_column_if_exists('case_processes', 'assignedToId', 'assigned_to_id');
SELECT _rename_column_if_exists('case_processes', 'startedAt', 'started_at');
SELECT _rename_column_if_exists('case_processes', 'completedAt', 'completed_at');
SELECT _rename_column_if_exists('case_processes', 'createdAt', 'created_at');
SELECT _rename_column_if_exists('case_processes', 'updatedAt', 'updated_at');

SELECT _rename_column_if_exists('case_process_dependencies', 'caseProcessId', 'case_process_id');
SELECT _rename_column_if_exists('case_process_dependencies', 'dependsOnCaseProcessId', 'depends_on_case_process_id');

SELECT _rename_column_if_exists('case_status_histories', 'caseId', 'case_id');
SELECT _rename_column_if_exists('case_status_histories', 'fromStatus', 'from_status');
SELECT _rename_column_if_exists('case_status_histories', 'toStatus', 'to_status');
SELECT _rename_column_if_exists('case_status_histories', 'changedAt', 'changed_at');

SELECT _rename_column_if_exists('notifications', 'recipientUserId', 'recipient_user_id');
SELECT _rename_column_if_exists('notifications', 'caseId', 'case_id');
SELECT _rename_column_if_exists('notifications', 'isRead', 'is_read');
SELECT _rename_column_if_exists('notifications', 'readAt', 'read_at');
SELECT _rename_column_if_exists('notifications', 'createdAt', 'created_at');

SELECT _rename_column_if_exists('push_subscriptions', 'userId', 'user_id');
SELECT _rename_column_if_exists('push_subscriptions', 'isActive', 'is_active');
SELECT _rename_column_if_exists('push_subscriptions', 'createdAt', 'created_at');
SELECT _rename_column_if_exists('push_subscriptions', 'updatedAt', 'updated_at');

DROP FUNCTION _rename_column_if_exists(text, text, text);
