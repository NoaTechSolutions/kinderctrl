import { PartialType } from '@nestjs/mapped-types';
import { CreateChildContactDto } from './create-child-contact.dto';

// PATCH /children/:id/contacts/:contactId — every field optional. Undefined
// fields are left untouched; an explicit null clears a nullable column.
export class UpdateChildContactDto extends PartialType(CreateChildContactDto) {}
